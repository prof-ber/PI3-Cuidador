import React, { useState, useEffect } from 'react';
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
  Button
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import ConfigureAlarmButton from './alarme'; // Importando o componente de alarme
import CheckList from './checklist'; // Importando o componente de checklist

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const Idoso = ({ idosoId }) => {
  const [idoso, setIdoso] = useState(null);
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
        const [result] = await db.executeSql(
          'SELECT * FROM idosos WHERE id = ?',
          [idosoId]
        );

        if (result.rows.length > 0) {
          const idosoData = result.rows.item(0);
          setIdoso(idosoData);
        } else {
          Alert.alert('Erro', 'Idoso não encontrado');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do idoso:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do idoso: ' + error.message);
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
      if (idoso.descricao) mensagem += `\nDescrição Geral:\n${idoso.descricao}\n`;
      if (idoso.importante) mensagem += `\nInformações Importantes:\n${idoso.importante}\n`;
      if (idoso.alergias) mensagem += `\nAlergias:\n${idoso.alergias}\n`;
      if (idoso.doencas) mensagem += `\nDoenças:\n${idoso.doencas}\n`;
      if (idoso.observacoes) mensagem += `\nObservações Adicionais:\n${idoso.observacoes}\n`;

      // Usar a API Share para compartilhar os dados
      await Share.share({
        message: mensagem,
        title: `Informações de ${idoso.nome}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar dados:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar os dados.');
    }
  };

  // Função para gerar as iniciais do nome para o avatar
  const getInitials = (name) => {
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
          {/* Placeholder para foto futura */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(idoso.nome)}</Text>
          </View>
          <TouchableOpacity style={styles.addPhotoButton}>
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
              Cadastrado em: {new Date(idoso.data_cadastro).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
          
          {idoso.ultima_atualizacao ? (
            <Text style={styles.dateText}>
              Última atualização: {new Date(idoso.ultima_atualizacao).toLocaleDateString('pt-BR')}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity 
          style={styles.shareButton}
          onPress={compartilharDados}
        >
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
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
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
    textShadowOffset: { width: 1, height: 1 },
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
    shadowOffset: { width: 0, height: 2 },
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
  }
});

export default Idoso;