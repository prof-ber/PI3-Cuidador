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
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const ListaIdosos = ({onIdosoSelecionado, refreshKey = 0}) => {
  const [idosos, setIdosos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idSelecionado, setIdSelecionado] = useState(null);
  const dbRef = useRef(null);
  const [imageStoragePath, setImageStoragePath] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const renderItem = useCallback(
    ({item}) => (
      <IdosoCard
        item={item}
        isSelected={item.id === idSelecionado}
        onSelect={() => selecionarIdoso(item.id)}
      />
    ),
    [idSelecionado, selecionarIdoso, forceRefresh],
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

const IdosoCard = React.memo(({item, isSelected, onSelect}) => {
  const [imageError, setImageError] = useState(false);

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
    </TouchableOpacity>
  );
});

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
  emptyContainer: {alignItems: 'center'},
  emptyText: {fontSize: 20, fontWeight: '700', color: '#666'},
  emptySubText: {fontSize: 14, color: '#999', marginTop: 6},
});

export default ListaIdosos;
