import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const BlocoNotas = () => {
  const [nota, setNota] = useState('');
  const [titulo, setTitulo] = useState('');
  const [loading, setLoading] = useState(false);
  const [notaId, setNotaId] = useState(null); // Para rastrear se estamos editando uma nota existente

  // Carregar nota salva quando o componente for montado
  useEffect(() => {
    carregarNota();
  }, []);

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

  // Função para salvar a nota no SQLite
  const salvarNota = async () => {
    if (titulo.trim() === '') {
      Alert.alert('Atenção', 'Por favor, adicione um título para sua nota.');
      return;
    }

    setLoading(true);
    let db = null;

    try {
      db = await openDatabase();
      const dataAtual = new Date().toISOString();

      if (notaId) {
        // Atualizar nota existente
        await db.executeSql(
          'UPDATE notas SET titulo = ?, conteudo = ?, ultima_atualizacao = ? WHERE id = ?',
          [titulo.trim(), nota.trim(), dataAtual, notaId]
        );
      } else {
        // Inserir nova nota
        const [result] = await db.executeSql(
          'INSERT INTO notas (titulo, conteudo, data_criacao, ultima_atualizacao) VALUES (?, ?, ?, ?)',
          [titulo.trim(), nota.trim(), dataAtual, dataAtual]
        );
        
        // Guardar o ID da nota recém-criada
        setNotaId(result.insertId);
      }

      Alert.alert('Sucesso', 'Nota salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      Alert.alert('Erro', 'Não foi possível salvar a nota: ' + error.message);
    } finally {
      if (db) {
        await db.close();
      }
      setLoading(false);
    }
  };

  // Função para carregar a nota mais recente do SQLite
  const carregarNota = async () => {
    setLoading(true);
    let db = null;

    try {
      db = await openDatabase();
      
      // Buscar a nota mais recente
      const [result] = await db.executeSql(
        'SELECT * FROM notas ORDER BY ultima_atualizacao DESC LIMIT 1'
      );
      
      if (result.rows.length > 0) {
        const notaCarregada = result.rows.item(0);
        setTitulo(notaCarregada.titulo);
        setNota(notaCarregada.conteudo);
        setNotaId(notaCarregada.id);
      }
    } catch (error) {
      console.error('Erro ao carregar nota:', error);
      Alert.alert('Erro', 'Não foi possível carregar a nota: ' + error.message);
    } finally {
      if (db) {
        await db.close();
      }
      setLoading(false);
    }
  };

  // Função para criar uma nova nota
  const novaNota = () => {
    if (titulo.trim() !== '' || nota.trim() !== '') {
      Alert.alert(
        'Nova Nota',
        'Deseja criar uma nova nota? Os dados não salvos serão perdidos.',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Criar Nova',
            onPress: () => {
              setTitulo('');
              setNota('');
              setNotaId(null);
            }
          }
        ]
      );
    } else {
      setTitulo('');
      setNota('');
      setNotaId(null);
    }
  };

  // Função para limpar a nota atual
  const limparNota = () => {
    if (titulo.trim() !== '' || nota.trim() !== '') {
      Alert.alert(
        'Limpar nota',
        'Tem certeza que deseja limpar esta nota?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Limpar',
            onPress: () => {
              setTitulo('');
              setNota('');
              // Não resetamos o notaId aqui, pois ainda estamos editando a mesma nota
            },
            style: 'destructive'
          }
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Bloco de Notas</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.tituloInput}
                placeholder="Título da nota"
                value={titulo}
                onChangeText={setTitulo}
                maxLength={50}
              />
              
              <TextInput
                style={styles.notaInput}
                placeholder="Digite sua nota aqui..."
                value={nota}
                onChangeText={setNota}
                multiline={true}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          
          <View style={styles.botoesContainer}>
            <TouchableOpacity 
              style={[styles.botao, styles.botaoLimpar]} 
              onPress={limparNota}
            >
              <Text style={styles.botaoTexto}>Limpar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.botao, styles.botaoNovo]} 
              onPress={novaNota}
            >
              <Text style={styles.botaoTexto}>Nova Nota</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.botao, styles.botaoSalvar]} 
              onPress={salvarNota}
            >
              <Text style={styles.botaoTexto}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
  scrollContainer: {
    flex: 1,
    padding: 15,
  },
  inputContainer: {
    flex: 1,
  },
  tituloInput: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 10,
    fontSize: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notaInput: {
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    flex: 1,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  botao: {
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
  },
  botaoSalvar: {
    backgroundColor: '#4CAF50',
  },
  botaoLimpar: {
    backgroundColor: '#f44336',
  },
  botaoNovo: {
    backgroundColor: '#2196F3',
  },
  botaoTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BlocoNotas;