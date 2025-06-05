import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
  Image,
  TextInput,
  Modal,
  Button,
  Platform,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import ConfigureAlarmButton from './alarme'; // Importando o componente de alarme
import CheckList from './checklist'; // Importando o componente de checklist
import RNFS from 'react-native-fs';
import {launchCamera} from 'react-native-image-picker';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const Idoso = ({idosoId}) => {
  const [idoso, setIdoso] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [imageStoragePath, setImageStoragePath] = useState(null);

  // Função para abrir o banco de dados
  const openDatabase = async () => {
    try {
      return await SQLite.openDatabase({
        name: 'cuidador.db',
        location: 'default',
      });
    } catch (error) {
      console.error('Erro ao abrir o banco de dados:', error);
      throw error;
    }
  };

  // Add this useEffect to create the image directory
  useEffect(() => {
    // Define the directory where we'll store images
    const imagePath = `${RNFS.DocumentDirectoryPath}/profile_images/`;
    setImageStoragePath(imagePath);

    // Create the directory if it doesn't exist
    RNFS.mkdir(imagePath)
      .then(() => console.log('Image directory created or already exists'))
      .catch(err => console.error('Error creating image directory:', err));
  }, []);

  // Verify if an image exists at the given path
  const verifyImageExists = async path => {
    try {
      // Try with the path as is first
      let exists = await RNFS.exists(path);

      if (!exists && !path.startsWith('file://')) {
        // If it doesn't exist and doesn't have file:// prefix, try adding it
        exists = await RNFS.exists(`file://${path}`);
      } else if (!exists && path.startsWith('file://')) {
        // If it doesn't exist and has file:// prefix, try removing it
        exists = await RNFS.exists(path.slice(7));
      }

      console.log(`Image at ${path} exists: ${exists}`);
      return exists;
    } catch (error) {
      console.error('Error checking if image exists:', error);
      return false;
    }
  };

  // Request necessary permissions for camera and storage
  const pedirPermissoes = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      console.log('Verificando permissões no Android ' + Platform.Version);

      // Array to collect all permissions that need to be requested
      const permissoesNecessarias = [];

      // Check camera permission
      const cameraStatus = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      console.log('Status da permissão de câmera:', cameraStatus);

      if (!cameraStatus) {
        permissoesNecessarias.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      // Check storage permissions based on Android version
      if (Platform.Version >= 33) {
        const mediaStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        );
        console.log('Status da permissão READ_MEDIA_IMAGES:', mediaStatus);

        if (!mediaStatus) {
          permissoesNecessarias.push(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          );
        }
      } else {
        // For Android 12 and below, check both read and write
        const readStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        console.log('Status da permissão READ_EXTERNAL_STORAGE:', readStatus);

        if (!readStatus) {
          permissoesNecessarias.push(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          );
        }

        // Only check WRITE_EXTERNAL_STORAGE for Android 10 (API 29) and below
        if (Platform.Version <= 29) {
          const writeStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          );
          console.log(
            'Status da permissão WRITE_EXTERNAL_STORAGE:',
            writeStatus,
          );

          if (!writeStatus) {
            permissoesNecessarias.push(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            );
          }
        }
      }

      // If all permissions are already granted
      if (permissoesNecessarias.length === 0) {
        console.log('Todas as permissões já concedidas');
        return true;
      }

      // Request all needed permissions at once
      console.log('Solicitando permissões:', permissoesNecessarias);
      const results = await PermissionsAndroid.requestMultiple(
        permissoesNecessarias,
      );

      // Check if all permissions were granted
      let allGranted = true;
      for (const permission of permissoesNecessarias) {
        const result = results[permission];
        console.log(`Resultado para ${permission}:`, result);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          allGranted = false;
        }
      }

      if (!allGranted) {
        console.log('Algumas permissões foram negadas');
        // Optionally show settings dialog if permissions were denied
        Alert.alert(
          'Permissões necessárias',
          'Para usar a câmera e salvar fotos, precisamos das permissões solicitadas. Por favor, vá às configurações do aplicativo para habilitá-las.',
          [
            {text: 'Cancelar', style: 'cancel'},
            {
              text: 'Configurações',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }

      return allGranted;
    } catch (err) {
      console.error('Erro ao verificar permissões:', err);
      return false;
    }
  };

  // Function to take a photo
  const tirarFoto = async () => {
    try {
      console.log('Iniciando processo de captura de foto');
      const permitido = await pedirPermissoes();

      if (!permitido) {
        console.log('Permissões não concedidas, abortando');
        return;
      }

      console.log('Permissões OK, abrindo câmera');

      // Use simpler camera options
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 800,
        maxWidth: 800,
      };

      const result = await launchCamera(options);
      console.log('Resultado da câmera:', JSON.stringify(result));

      if (result.didCancel) {
        console.log('Usuário cancelou a captura');
        return;
      }

      if (result.errorCode) {
        console.log('Erro na câmera:', result.errorMessage);
        Alert.alert('Erro', `Erro ao usar a câmera: ${result.errorMessage}`);
        return;
      }

      if (!result.assets || !result.assets[0]?.uri) {
        console.log('Nenhuma imagem capturada');
        return;
      }

      const sourceUri = result.assets[0].uri;
      console.log('Foto capturada com sucesso. URI:', sourceUri);

      // Create a unique filename for the image
      const fileName = `idoso_${idosoId}_${Date.now()}.jpg`;
      const destinationPath = `${imageStoragePath}${fileName}`;

      console.log('Copiando imagem para:', destinationPath);

      // Copy the image to our app's storage
      await RNFS.copyFile(sourceUri, destinationPath);

      // Verify the image was saved correctly
      const fileExists = await verifyImageExists(destinationPath);
      if (!fileExists) {
        console.error(
          'Failed to save image: File does not exist at destination',
        );
        Alert.alert('Erro', 'Não foi possível salvar a imagem.');
        return;
      }

      // Create a proper file URI that React Native's Image component can use
      const fileUri = `file://${destinationPath}`;
      console.log('URI da imagem para o banco de dados:', fileUri);

      // Update database with the path to the saved image
      const db = await openDatabase();
      if (db) {
        console.log(
          'Atualizando banco de dados com caminho da imagem:',
          fileUri,
        );

        // Check if there's already an image for this idoso
        const [existingResult] = await db.executeSql(
          'SELECT * FROM profile_images WHERE idoso_id = ?',
          [idosoId],
        );

        const currentTime = new Date().toISOString();

        if (existingResult.rows.length > 0) {
          // Update existing image record
          await db.executeSql(
            'UPDATE profile_images SET image_path = ?, created_at = ? WHERE idoso_id = ?',
            [fileUri, currentTime, idosoId],
          );
        } else {
          // Insert new image record
          await db.executeSql(
            'INSERT INTO profile_images (idoso_id, image_path, created_at) VALUES (?, ?, ?)',
            [idosoId, fileUri, currentTime],
          );
        }

        console.log('Banco de dados atualizado');

        // Update the UI
        setProfileImage(fileUri);
        setImageError(false);

        await db.close();
        Alert.alert('Sucesso', 'Foto salva com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao processar foto:', error);
      Alert.alert(
        'Erro',
        `Não foi possível processar a foto: ${error.message}`,
      );
    }
  };

  // Function to remove a photo
  const removerFoto = async () => {
    try {
      Alert.alert(
        'Remover foto',
        'Tem certeza que deseja remover a foto de perfil?',
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Remover',
            onPress: async () => {
              const db = await openDatabase();

              // Delete the record from profile_images table
              await db.executeSql(
                'DELETE FROM profile_images WHERE idoso_id = ?',
                [idosoId],
              );

              // If the image file exists, delete it
              if (profileImage) {
                const filePath = profileImage.replace('file://', '');
                const exists = await RNFS.exists(filePath);
                if (exists) {
                  await RNFS.unlink(filePath);
                }
              }

              // Update UI
              setProfileImage(null);
              setImageError(false);

              await db.close();
              Alert.alert('Sucesso', 'Foto removida com sucesso!');
            },
            style: 'destructive',
          },
        ],
      );
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      Alert.alert('Erro', `Não foi possível remover a foto: ${error.message}`);
    }
  };

  // Carregar dados do idoso quando o componente for montado
  useEffect(() => {
    const carregarIdoso = async () => {
      if (!idosoId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      let db = null;

      try {
        db = await openDatabase();

        // Modificar a consulta para incluir a imagem de perfil
        const [result] = await db.executeSql(
          `
          SELECT i.*, pi.image_path as avatarImage 
          FROM idosos i 
          LEFT JOIN profile_images pi ON i.id = pi.idoso_id 
          WHERE i.id = ?
        `,
          [idosoId],
        );

        if (result.rows.length > 0) {
          const idosoData = result.rows.item(0);
          setIdoso(idosoData);

          // Se houver uma imagem de perfil, verificar se ela existe
          if (idosoData.avatarImage) {
            const imageExists = await verifyImageExists(idosoData.avatarImage);
            if (imageExists) {
              setProfileImage(idosoData.avatarImage);
            } else {
              console.log(
                'Imagem de perfil não encontrada no caminho:',
                idosoData.avatarImage,
              );
              setImageError(true);
            }
          }
        } else {
          Alert.alert('Erro', 'Idoso não encontrado');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do idoso:', error);
        Alert.alert(
          'Erro',
          'Não foi possível carregar os dados do idoso: ' + error.message,
        );
      } finally {
        if (db) {
          try {
            await db.close();
          } catch (closeError) {
            console.error('Erro ao fechar conexão com banco:', closeError);
          }
        }
        setIsLoading(false);
      }
    };

    carregarIdoso();
  }, [idosoId]);

  // Função para compartilhar os dados do idoso
  const compartilharDados = async () => {
    if (!idoso) {
      Alert.alert('Aviso', 'Não há dados para compartilhar.');
      return;
    }

    try {
      // Formatar os dados para compartilhamento
      let mensagem = `INFORMAÇÕES DO IDOSO\n\n`;
      mensagem += `Nome: ${idoso.nome}\n`;
      if (idoso.idade) mensagem += `Idade: ${idoso.idade} anos\n`;
      if (idoso.endereco) mensagem += `Endereço: ${idoso.endereco}\n`;
      if (idoso.contatos) mensagem += `Contatos:\n${idoso.contatos}\n`;
      if (idoso.descricao)
        mensagem += `\nDescrição Geral:\n${idoso.descricao}\n`;
      if (idoso.importante)
        mensagem += `\nInformações Importantes:\n${idoso.importante}\n`;
      if (idoso.alergias) mensagem += `\nAlergias:\n${idoso.alergias}\n`;
      if (idoso.doencas) mensagem += `\nDoenças:\n${idoso.doencas}\n`;
      if (idoso.observacoes)
        mensagem += `\nObservações Adicionais:\n${idoso.observacoes}\n`;

      // Usar a API Share para compartilhar os dados
      await Share.share({
        message: mensagem,
        title: `Informações de ${idoso.nome}`,
      });
    } catch (error) {
      console.error('Erro ao compartilhar dados:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar os dados.');
    }
  };

  // Função para gerar as iniciais do nome para o avatar
  const getInitials = name => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Renderizar o componente
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Carregando informações...</Text>
      </View>
    );
  }

  if (!idoso) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Idoso não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      {/* Cabeçalho com foto e informações básicas */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {/* Exibir a imagem de perfil se disponível, caso contrário mostrar as iniciais */}
          {profileImage && !imageError ? (
            <Image
              source={{uri: profileImage}}
              style={styles.avatar}
              onError={() => {
                console.warn('Erro ao carregar imagem:', profileImage);
                setImageError(true);
              }}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(idoso.nome)}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={() => {
              if (profileImage) {
                // If there's already a profile image, show options
                Alert.alert('Foto de Perfil', 'O que você deseja fazer?', [
                  {
                    text: 'Tirar Nova Foto',
                    onPress: tirarFoto,
                  },
                  {
                    text: 'Remover Foto',
                    onPress: removerFoto,
                    style: 'destructive',
                  },
                  {
                    text: 'Cancelar',
                    style: 'cancel',
                  },
                ]);
              } else {
                // If there's no profile image, just take a photo
                tirarFoto();
              }
            }}>
            <Text style={styles.addPhotoText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{idoso.nome}</Text>
          {idoso.idade ? (
            <Text style={styles.headerAge}>{idoso.idade} anos</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.container}>
        {/* Informações detalhadas */}
        {idoso.endereco ? (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Endereço:</Text>
            <Text style={styles.infoValue}>{idoso.endereco}</Text>
          </View>
        ) : null}

        {idoso.contatos ? (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Contatos:</Text>
            <Text style={styles.infoValue}>{idoso.contatos}</Text>
          </View>
        ) : null}

        {idoso.descricao ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Descrição Geral</Text>
            <Text style={styles.infoValue}>{idoso.descricao}</Text>
          </View>
        ) : null}

        {idoso.importante ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informações Importantes</Text>
            <Text style={styles.infoValue}>{idoso.importante}</Text>
          </View>
        ) : null}

        {idoso.alergias ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Alergias</Text>
            <Text style={styles.infoValue}>{idoso.alergias}</Text>
          </View>
        ) : null}

        {idoso.doencas ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Doenças</Text>
            <Text style={styles.infoValue}>{idoso.doencas}</Text>
          </View>
        ) : null}

        {idoso.observacoes ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Observações Adicionais</Text>
            <Text style={styles.infoValue}>{idoso.observacoes}</Text>
          </View>
        ) : null}

        <View style={styles.dateSection}>
          {idoso.data_cadastro ? (
            <Text style={styles.dateText}>
              Cadastrado em:{' '}
              {new Date(idoso.data_cadastro).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}

          {idoso.ultima_atualizacao ? (
            <Text style={styles.dateText}>
              Última atualização:{' '}
              {new Date(idoso.ultima_atualizacao).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={compartilharDados}>
          <Text style={styles.shareButtonText}>Compartilhar Informações</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de Checklist */}
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Checklist de Cuidados</Text>
        <CheckList idosoId={idosoId} idosoNome={idoso.nome} />
      </View>

      {/* Seção de Alarmes */}
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Alarmes e Lembretes</Text>
        <ConfigureAlarmButton idosoNome={idoso.nome} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#4A90E2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addPhotoText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 22,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  headerAge: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#4A90E2',
    paddingBottom: 5,
  },
  dateSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#E8F4FD',
    borderRadius: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 20,
  },
  shareButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  photoSection: {
    alignItems: 'center',
    padding: 10,
  },
  photoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  photoButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#FF6B6B',
  },
  photoButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Idoso;
