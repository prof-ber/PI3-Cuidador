import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const Select = () => {
  const [idosos, setIdosos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('idosos'); // 'idosos' ou 'notas'

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Abrir conexão com o banco
      const db = await SQLite.openDatabase({
        name: 'cuidador.db',
        location: 'default'
      });
      
      console.log('Banco aberto com sucesso para consulta');
      
      // Carregar dados de idosos
      const [idososResult] = await db.executeSql('SELECT * FROM idosos ORDER BY nome');
      const idososCount = idososResult.rows.length;
      
      const idososArray = [];
      for (let i = 0; i < idososCount; i++) {
        idososArray.push(idososResult.rows.item(i));
      }
      setIdosos(idososArray);
      
      // Carregar dados de notas
      const [notasResult] = await db.executeSql('SELECT * FROM notas ORDER BY data_criacao DESC');
      const notasCount = notasResult.rows.length;
      
      const notasArray = [];
      for (let i = 0; i < notasCount; i++) {
        notasArray.push(notasResult.rows.item(i));
      }
      setNotas(notasArray);
      
      // Fechar a conexão
      await db.close();
      console.log('Consulta finalizada e banco fechado');
      
    } catch (error) {
      console.error('Erro ao consultar banco:', error);
      setError(error.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Formatar a data para exibição
  const formatarData = (dataString) => {
    if (!dataString) return 'Data não disponível';
    
    try {
      const data = new Date(dataString);
      return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Renderizar um item da lista de idosos
  const renderIdosoItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => mostrarDetalhesIdoso(item)}
    >
      <Text style={styles.itemTitulo}>{item.nome}</Text>
      <Text style={styles.itemSubtitulo}>
        {item.idade ? `${item.idade} anos` : 'Idade não informada'}
      </Text>
      <Text style={styles.itemData}>
        Cadastrado em: {formatarData(item.data_cadastro)}
      </Text>
    </TouchableOpacity>
  );

  // Renderizar um item da lista de notas
  const renderNotaItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => mostrarDetalhesNota(item)}
    >
      <Text style={styles.itemTitulo}>{item.titulo || 'Nota sem título'}</Text>
      <Text style={styles.itemConteudo} numberOfLines={2}>
        {item.conteudo || 'Sem conteúdo'}
      </Text>
      <Text style={styles.itemData}>
        Criado em: {formatarData(item.data_criacao)}
      </Text>
    </TouchableOpacity>
  );

  // Mostrar detalhes de um idoso
  const mostrarDetalhesIdoso = (idoso) => {
    let detalhes = `Nome: ${idoso.nome}\n`;
    if (idoso.idade) detalhes += `Idade: ${idoso.idade} anos\n`;
    if (idoso.endereco) detalhes += `Endereço: ${idoso.endereco}\n`;
    if (idoso.contatos) detalhes += `Contatos: ${idoso.contatos}\n`;
    if (idoso.descricao) detalhes += `Descrição: ${idoso.descricao}\n`;
    if (idoso.importante) detalhes += `Informações importantes: ${idoso.importante}\n`;
    if (idoso.alergias) detalhes += `Alergias: ${idoso.alergias}\n`;
    if (idoso.doencas) detalhes += `Doenças: ${idoso.doencas}\n`;
    if (idoso.observacoes) detalhes += `Observações: ${idoso.observacoes}\n`;
    
    Alert.alert(
      `Detalhes de ${idoso.nome}`,
      detalhes,
      [{ text: 'Fechar' }]
    );
  };

  // Mostrar detalhes de uma nota
  const mostrarDetalhesNota = (nota) => {
    Alert.alert(
      nota.titulo || 'Nota sem título',
      nota.conteudo || 'Sem conteúdo',
      [{ text: 'Fechar' }]
    );
  };

  // Atualizar os dados
  const atualizarDados = () => {
    carregarDados();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Consulta de Dados</Text>
      </View>
      
      {/* Tabs para alternar entre idosos e notas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'idosos' && styles.activeTab]}
          onPress={() => setActiveTab('idosos')}
        >
          <Text style={[styles.tabText, activeTab === 'idosos' && styles.activeTabText]}>
            Idosos ({idosos.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notas' && styles.activeTab]}
          onPress={() => setActiveTab('notas')}
        >
          <Text style={[styles.tabText, activeTab === 'notas' && styles.activeTabText]}>
            Notas ({notas.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro: {error}</Text>
          <TouchableOpacity style={styles.recarregarButton} onPress={atualizarDados}>
            <Text style={styles.recarregarButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {activeTab === 'idosos' ? (
            idosos.length > 0 ? (
              <FlatList
                data={idosos}
                renderItem={renderIdosoItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum idoso cadastrado</Text>
              </View>
            )
          ) : (
            notas.length > 0 ? (
              <FlatList
                data={notas}
                renderItem={renderNotaItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma nota cadastrada</Text>
              </View>
            )
          )}
          
          <TouchableOpacity style={styles.refreshButton} onPress={atualizarDados}>
            <Text style={styles.refreshButtonText}>Atualizar dados</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  recarregarButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  recarregarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  itemTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemSubtitulo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  itemConteudo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemData: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default Select;