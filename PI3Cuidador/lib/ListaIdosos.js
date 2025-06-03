import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const ListaIdosos = ({ onIdosoSelecionado, refreshKey = 0 }) => {
  const [idosos, setIdosos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função para abrir o banco de dados
  const openDatabase = async () => {
    try {
      return await SQLite.openDatabase({
        name: 'cuidador.db',
        location: 'default'
      });
    } catch (error) {
      console.error('Erro ao abrir o banco de dados:', error);
      throw error;
    }
  };

  // Função para carregar a lista de idosos
  const carregarIdosos = async () => {
    setIsLoading(true);
    let db = null;
    
    try {
      db = await openDatabase();
      
      // Verificar se a tabela existe
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
      
      // Buscar todos os idosos ordenados pelo nome
      const [result] = await db.executeSql('SELECT * FROM idosos ORDER BY nome');
      
      const idososArray = [];
      for (let i = 0; i < result.rows.length; i++) {
        idososArray.push(result.rows.item(i));
      }
      
      setIdosos(idososArray);
    } catch (error) {
      console.error('Erro ao carregar idosos:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de idosos: ' + error.message);
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

  // Carregar a lista de idosos quando o componente for montado ou quando refreshKey mudar
  useEffect(() => {
    carregarIdosos();
  }, [refreshKey]); // Adicionando refreshKey como dependência para recarregar quando mudar

  // Renderizar cada item da lista
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.idosoCard}
      onPress={() => {
        // Chama a função de callback diretamente quando um idoso é selecionado
        if (onIdosoSelecionado) {
          onIdosoSelecionado(Number(item.id));
        }
      }}
    >
      <View style={styles.avatarContainer}>
        {/* Placeholder para a foto futura */}
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.nomeIdoso}>{item.nome}</Text>
        {item.idade && <Text style={styles.idadeIdoso}>{item.idade} anos</Text>}
      </View>
    </TouchableOpacity>
  );

  // Renderizar mensagem quando não há idosos cadastrados
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Nenhum idoso cadastrado</Text>
      <Text style={styles.emptySubText}>Clique em "Adicionar Idoso" para começar</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando idosos...</Text>
        </View>
      ) : (
        <FlatList
          data={idosos}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={renderEmptyList}
          contentContainerStyle={idosos.length === 0 ? styles.listEmptyContainer : styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A90E2',
  },
  listContainer: {
    padding: 10,
  },
  listEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  idosoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  nomeIdoso: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  idadeIdoso: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  }
});

export default ListaIdosos;