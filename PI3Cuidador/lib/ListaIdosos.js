import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import {launchCamera} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import {Linking} from 'react-native';

SQLite.enablePromise(true);

const ListaIdosos = ({onIdosoSelecionado, refreshKey = 0}) => {
  const [idosos, setIdosos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idSelecionado, setIdSelecionado] = useState(null);
  const dbRef = useRef(null);
  const [imageStoragePath, setImageStoragePath] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Define the directory where we'll store images
    const imagePath = `${RNFS.DocumentDirectoryPath}/profile_images/`;
    setImageStoragePath(imagePath);

    // Create the directory if it doesn't exist
    RNFS.mkdir(imagePath)
      .then(() => console.log('Image directory created or already exists'))
      .catch(err => console.error('Error creating image directory:', err));
  }, []);

  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const abrirBanco = async () => {
      try {
        const db = await SQLite.openDatabase({
          name: 'cuidador.db',
          location: 'default',
        });
        dbRef.current = db;

        // First, check if the old table exists and has the avatarImage column
        try {
          const [tableInfo] = await db.executeSql('PRAGMA table_info(idosos)');
          let hasAvatarColumn = false;

          for (let i = 0; i < tableInfo.rows.length; i++) {
            const column = tableInfo.rows.item(i);
            if (column.name === 'avatarImage') {
              hasAvatarColumn = true;
              break;
            }
          }

          if (hasAvatarColumn) {
            // If the old table exists with avatarImage, migrate data to the new structure
            console.log('Migrando dados de imagens para nova estrutura...');

            // Get all idosos with avatarImage
            const [idososResult] = await db.executeSql(
              'SELECT id, avatarImage FROM idosos WHERE avatarImage IS NOT NULL',
            );

            // Create the profile_images table
            await db.executeSql(`
              CREATE TABLE IF NOT EXISTS profile_images (
                idoso_id INTEGER PRIMARY KEY,
                image_path TEXT NOT NULL,
                created_at TEXT,
                FOREIGN KEY (idoso_id) REFERENCES idosos (id) ON DELETE CASCADE
              )
              `);

            // Migrate data
            const currentTime = new Date().toISOString();
            for (let i = 0; i < idososResult.rows.length; i++) {
              const idoso = idososResult.rows.item(i);
              if (idoso.avatarImage) {
                await db.executeSql(
                  'INSERT OR REPLACE INTO profile_images (idoso_id, image_path, created_at) VALUES (?, ?, ?)',
                  [idoso.id, idoso.avatarImage, currentTime],
                );
              }
            }

            // Create a new idosos table without avatarImage
            await db.executeSql(`
              CREATE TABLE IF NOT EXISTS idosos_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                idade INTEGER,
                endereco TEXT,
                contatos TEXT,
                descricao TEXT,
                importante TEXT,
                alergias TEXT,
                doencas TEXT,
                observacoes TEXT,
                data_cadastro TEXT,
                ultima_atualizacao TEXT
              )
              `);

            // Copy data from old table to new table
            await db.executeSql(`
              INSERT INTO idosos_new (id, nome, idade, endereco, contatos, descricao, 
                importante, alergias, doencas, observacoes, data_cadastro, ultima_atualizacao)
              SELECT id, nome, idade, endereco, contatos, descricao, 
                importante, alergias, doencas, observacoes, data_cadastro, ultima_atualizacao
              FROM idosos
              `);

            // Drop old table and rename new table
            await db.executeSql('DROP TABLE idosos');
            await db.executeSql('ALTER TABLE idosos_new RENAME TO idosos');

            console.log('Migração concluída com sucesso');
          } else {
            // If the table doesn't have avatarImage, just create the tables normally
            await db.executeSql(`
              CREATE TABLE IF NOT EXISTS idosos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                idade INTEGER,
                endereco TEXT,
                contatos TEXT,
                descricao TEXT,
                importante TEXT,
                alergias TEXT,
                doencas TEXT,
                observacoes TEXT,
                data_cadastro TEXT,
                ultima_atualizacao TEXT
              )
              `);

            await db.executeSql(`
              CREATE TABLE IF NOT EXISTS profile_images (
                idoso_id INTEGER PRIMARY KEY,
                image_path TEXT NOT NULL,
                created_at TEXT,
                FOREIGN KEY (idoso_id) REFERENCES idosos (id) ON DELETE CASCADE
              )
              `);
          }
        } catch (migrationError) {
          console.error('Erro durante migração:', migrationError);

          // If there was an error in migration, just create the tables
          await db.executeSql(`
            CREATE TABLE IF NOT EXISTS idosos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nome TEXT NOT NULL,
              idade INTEGER,
              endereco TEXT,
              contatos TEXT,
              descricao TEXT,
              importante TEXT,
              alergias TEXT,
              doencas TEXT,
              observacoes TEXT,
              data_cadastro TEXT,
              ultima_atualizacao TEXT
            )
            `);

          await db.executeSql(`
            CREATE TABLE IF NOT EXISTS profile_images (
              idoso_id INTEGER PRIMARY KEY,
              image_path TEXT NOT NULL,
              created_at TEXT,
              FOREIGN KEY (idoso_id) REFERENCES idosos (id) ON DELETE CASCADE
            )
            `);
        }

        if (isMounted) carregarIdosos(db);
      } catch (error) {
        console.error('Erro ao abrir/criar banco:', error);
        Alert.alert('Erro', 'Não foi possível abrir o banco de dados.');
        setIsLoading(false);
      }
    };

    abrirBanco();

    return () => {
      isMounted = false;
      dbRef.current
        ?.close()
        .catch(err => console.warn('Erro ao fechar banco:', err));
    };
  }, []);
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

  const carregarIdosos = useCallback(async (db = dbRef.current) => {
    if (!db) return;
    setIsLoading(true);
    try {
      // Join with profile_images table to get the image paths
      const [result] = await db.executeSql(`
      SELECT i.*, pi.image_path as avatarImage 
      FROM idosos i 
      LEFT JOIN profile_images pi ON i.id = pi.idoso_id 
      ORDER BY i.nome
      `);

      const lista = [];
      for (let i = 0; i < result.rows.length; i++) {
        lista.push(result.rows.item(i));
      }
      setIdosos(lista);
    } catch (error) {
      console.error('Erro ao carregar idosos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os idosos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dbRef.current) carregarIdosos();
  }, [refreshKey, carregarIdosos]);

  const selecionarIdoso = useCallback(
    id => {
      setIdSelecionado(id);
      onIdosoSelecionado(id);
    },
    [onIdosoSelecionado],
  );

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

  // First, update the tirarFoto function to use the profile_images table
  const tirarFoto = useCallback(
    async idosoId => {
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

        // Add these lines here
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
        const db = dbRef.current;
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
          await carregarIdosos();
          Alert.alert('Sucesso', 'Foto salva com sucesso!');
        }
      } catch (error) {
        console.error('Erro ao processar foto:', error);
        Alert.alert(
          'Erro',
          `Não foi possível processar a foto: ${error.message}`,
        );
      }
    },
    [carregarIdosos, pedirPermissoes, imageStoragePath],
  );

  const renderItem = useCallback(
    ({item}) => (
      <IdosoCard
        item={item}
        isSelected={item.id === idSelecionado}
        onSelect={() => selecionarIdoso(item.id)}
        onTirarFoto={() => tirarFoto(item.id)}
        onRemoveFoto={forceRefresh}
      />
    ),
    [idSelecionado, selecionarIdoso, tirarFoto, forceRefresh],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={idosos}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={<EmptyList />}
          contentContainerStyle={
            idosos.length === 0
              ? styles.listEmptyContainer
              : styles.listContainer
          }
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const IdosoCard = React.memo(
  ({item, isSelected, onSelect, onTirarFoto, onRemoveFoto}) => {
    const [imageError, setImageError] = useState(false);

    // Update the removerFoto function to call onRemoveFoto
    const removerFoto = async () => {
      try {
        const db = await SQLite.openDatabase({
          name: 'cuidador.db',
          location: 'default',
        });

        // Delete the record from profile_images table
        await db.executeSql('DELETE FROM profile_images WHERE idoso_id = ?', [
          item.id,
        ]);

        // If the image file exists, delete it
        if (item.avatarImage) {
          const filePath = item.avatarImage.replace('file://', '');
          const exists = await RNFS.exists(filePath);
          if (exists) {
            await RNFS.unlink(filePath);
          }
        }

        // Force refresh the list
        Alert.alert('Sucesso', 'Foto removida com sucesso!');
        setImageError(true); // This will immediately hide the image

        // Call the onRemoveFoto callback to refresh the parent component
        if (onRemoveFoto) {
          onRemoveFoto();
        }

        // Close the database
        await db.close();
      } catch (error) {
        console.error('Erro ao remover foto:', error);
        Alert.alert(
          'Erro',
          `Não foi possível remover a foto: ${error.message}`,
        );
      }
    };
    // Confirm before removing the photo
    const confirmarRemocao = () => {
      Alert.alert(
        'Remover foto',
        'Tem certeza que deseja remover a foto de perfil?',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Remover', onPress: removerFoto, style: 'destructive'},
        ],
      );
    };

    return (
      <TouchableOpacity
        style={[styles.idosoCard, isSelected && styles.idosoCardSelected]}
        onPress={onSelect}
        activeOpacity={0.8}>
        <View style={styles.avatarContainer}>
          {item.avatarImage && !imageError ? (
            <View>
              <Image
                source={{uri: item.avatarImage}}
                style={styles.avatarImage}
                onError={e => {
                  console.warn('Image loading error:', e.nativeEvent.error);
                  console.warn('Failed URI:', item.avatarImage);
                  setImageError(true);
                }}
              />
              {/* Add remove button overlay */}
              <TouchableOpacity
                style={styles.removePhotoButton}
                onPress={confirmarRemocao}>
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.nome.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nomeIdoso}>{item.nome}</Text>
          {item.idade != null && (
            <Text style={styles.idadeIdoso}>{item.idade} anos</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.botaoFoto}
          onPress={onTirarFoto}
          activeOpacity={0.7}>
          <Text style={styles.botaoTexto}>📷</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
);

const EmptyList = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>Nenhum idoso cadastrado</Text>
    <Text style={styles.emptySubText}>
      Clique em "Adicionar Idoso" para começar
    </Text>
  </View>
);

const Loading = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A90E2" />
    <Text style={styles.loadingText}>Carregando idosos...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  listContainer: {padding: 12},
  listEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {marginTop: 10, fontSize: 16, color: '#4A90E2'},

  idosoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  idosoCardSelected: {borderWidth: 2, borderColor: '#4A90E2'},
  avatarContainer: {marginRight: 15},
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {color: 'white', fontSize: 28, fontWeight: '700'},
  avatarImage: {width: 60, height: 60, borderRadius: 30},
  infoContainer: {flex: 1, justifyContent: 'center'},
  nomeIdoso: {fontSize: 18, fontWeight: '700', color: '#222'},
  idadeIdoso: {fontSize: 14, color: '#555', marginTop: 4},
  botaoFoto: {
    backgroundColor: '#28A745',
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoTexto: {color: '#fff', fontSize: 22},
  emptyContainer: {alignItems: 'center'},
  emptyText: {fontSize: 20, fontWeight: '700', color: '#666'},
  emptySubText: {fontSize: 14, color: '#999', marginTop: 6},
});

export default ListaIdosos;
