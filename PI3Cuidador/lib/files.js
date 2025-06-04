import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {launchCamera} from 'react-native-image-picker';

const FILE_STORAGE_KEY = '@saved_files';
const PROFILE_KEY = '@profile_picture';

const usePermissions = () => {
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Permissão para usar a câmera',
          message: 'O app precisa acessar a câmera para tirar fotos.',
          buttonPositive: 'OK',
        },
      );

      if (cameraGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permissão negada', 'Permissão da câmera é necessária.');
        return false;
      }

      const storagePermission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const storageGranted = await PermissionsAndroid.request(
        storagePermission,
        {
          title: 'Permissão de arquivos',
          message: 'O app precisa acessar arquivos para salvar as mídias.',
          buttonPositive: 'OK',
        },
      );

      if (storageGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permissão negada', 'Permissão de arquivos é necessária.');
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Erro de permissão:', error);
      return false;
    }
  }, []);

  return {requestPermissions};
};

const FileItem = React.memo(({file, onDelete, onSetProfile, onOpen}) => (
  <View style={styles.fileItem}>
    {file.type === 'image' && (
      <Image source={{uri: file.uri}} style={styles.thumbnail} />
    )}
    <View style={styles.fileInfo}>
      <Text style={styles.fileName} numberOfLines={1}>
        {file.name}
      </Text>
      <View style={styles.fileActions}>
        {file.type === 'image' && (
          <TouchableOpacity
            onPress={() => onSetProfile(file.uri)}
            style={styles.iconButton}>
            <Text style={styles.profileButtonText}>Perfil</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(file.id)}
          style={styles.iconButton}>
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onOpen(file)}
          style={styles.iconButton}>
          <Text style={styles.openButtonText}>Abrir</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
));

const FileManager = forwardRef((props, ref) => {
  const [files, setFiles] = useState([]);
  const [profilePic, setProfilePic] = useState(null);
  const {requestPermissions} = usePermissions();

  useEffect(() => {
    (async () => {
      try {
        const savedFiles = await AsyncStorage.getItem(FILE_STORAGE_KEY);
        const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
        setFiles(savedFiles ? JSON.parse(savedFiles) : []);
        setProfilePic(savedProfile);
      } catch (error) {
        console.warn('Erro ao carregar:', error);
      }
    })();
  }, []);

  const saveFiles = useCallback(async updatedFiles => {
    try {
      await AsyncStorage.setItem(
        FILE_STORAGE_KEY,
        JSON.stringify(updatedFiles),
      );
      setFiles(updatedFiles);
    } catch (error) {
      console.warn('Erro ao salvar:', error);
    }
  }, []);

  const deleteFile = useCallback(
    async id => {
      const fileToDelete = files.find(f => f.id === id);
      if (!fileToDelete) return;

      try {
        await RNFS.unlink(fileToDelete.path);
      } catch (error) {
        console.warn('Erro ao deletar arquivo:', error);
      }

      const updatedFiles = files.filter(f => f.id !== id);
      await saveFiles(updatedFiles);
    },
    [files, saveFiles],
  );

  const setAsProfilePic = useCallback(async uri => {
    try {
      setProfilePic(uri);
      await AsyncStorage.setItem(PROFILE_KEY, uri);
    } catch (error) {
      console.warn('Erro ao definir perfil:', error);
    }
  }, []);

  const removeProfilePic = useCallback(async () => {
    try {
      setProfilePic(null);
      await AsyncStorage.removeItem(PROFILE_KEY);
    } catch (error) {
      console.warn('Erro ao remover perfil:', error);
    }
  }, []);

  const openFile = useCallback(file => {
    Alert.alert(
      'Abrir arquivo',
      'Funcionalidade de visualização ainda não implementada.',
    );
  }, []);

  const takePhoto = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      // Using react-native-image-picker instead of ImageCropPicker
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
        includeBase64: false,
      });

      // Handle user cancellation
      if (result.didCancel) {
        return;
      }

      // Handle errors
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Erro ao capturar imagem');
      }

      // Get the captured image
      const image = result.assets?.[0];
      if (!image?.uri) {
        throw new Error('Imagem não capturada corretamente');
      }

      // Create a unique filename
      const originalName = image.fileName || `file_${Date.now()}.jpg`;
      const sanitizedName = `${Date.now()}_${originalName.replace(
        /\s+/g,
        '_',
      )}`;
      const destination = `${RNFS.DocumentDirectoryPath}/${sanitizedName}`;

      // Copy the file to app's document directory
      const localPath = image.uri.replace('file://', '');
      await RNFS.copyFile(localPath, destination);

      // Create a new file object
      const newFile = {
        id: Date.now().toString(),
        name: originalName,
        path: destination,
        uri: `file://${destination}`,
        type: 'image',
        favorite: false,
      };

      // Save the file to the list
      await saveFiles([...files, newFile]);
    } catch (error) {
      console.warn('Erro ao tirar foto:', error);
      Alert.alert('Erro', `Falha ao tirar e salvar a foto: ${error.message}`);
    }
  }, [files, requestPermissions, saveFiles]);

  useImperativeHandle(ref, () => ({
    tirarFoto: takePhoto,
  }));

  return (
    <View style={styles.container}>
      {/* Botão para tirar foto */}
      <TouchableOpacity style={styles.takePhotoButton} onPress={takePhoto}>
        <Text style={styles.takePhotoButtonText}>Tirar Foto</Text>
      </TouchableOpacity>

      {profilePic && (
        <View style={styles.profileContainer}>
          <Image source={{uri: profilePic}} style={styles.profilePic} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>Foto de Perfil</Text>
            <TouchableOpacity
              style={styles.removeProfile}
              onPress={removeProfilePic}>
              <Text style={styles.removeProfileText}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={files}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <FileItem
            file={item}
            onDelete={deleteFile}
            onSetProfile={setAsProfilePic}
            onOpen={openFile}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum arquivo salvo ainda.</Text>
        }
        contentContainerStyle={files.length === 0 && styles.emptyContainer}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    padding: 16,
  },
  takePhotoButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
    alignSelf: 'center',
    width: '60%',
  },

  takePhotoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  removeProfile: {
    backgroundColor: '#FF3B30',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  removeProfileText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  profilePic: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  fileItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
  },
  profileButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  openButtonText: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#aaa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default FileManager;
