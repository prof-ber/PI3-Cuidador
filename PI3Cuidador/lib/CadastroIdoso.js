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
  ActivityIndicator,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const CadastroIdoso = ({ idosoId: idosoIdProp, onClose }) => {
  // Estados para os campos do formulário
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [endereco, setEndereco] = useState('');
  const [contatos, setContatos] = useState('');
  const [descricao, setDescricao] = useState('');
  const [importante, setImportante] = useState('');
  const [alergias, setAlergias] = useState('');
  const [doencas, setDoencas] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Adicionando estado para controlar o salvamento
  const [dataCadastro, setDataCadastro] = useState(null);
  const [idosoId, setIdosoId] = useState(null); // Para rastrear o ID do idoso no banco

  // Carregar dados salvos quando o componente for montado
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true);
      try {
        await inicializarBancoDeDados();
        
        // Se tiver um ID específico, carrega esse idoso
        if (idosoIdProp) {
          await carregarIdosoPorId(idosoIdProp);
        } else {
          // Se não tiver ID, cria um novo cadastro
          setNome('');
          setIdade('');
          setEndereco('');
          setContatos('');
          setDescricao('');
          setImportante('');
          setAlergias('');
          setDoencas('');
          setObservacoes('');
          setDataCadastro(null);
          setIdosoId(null);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
        Alert.alert('Erro', 'Ocorreu um erro ao inicializar o aplicativo: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    setup();
  }, [idosoIdProp]);
  
  // Função para inicializar o banco de dados
  const inicializarBancoDeDados = async () => {
    let db = null;
    try {
      db = await openDatabase();
      
      // Criar tabela de idosos se não existir
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
      return true;
    } catch (error) {
      console.error('Erro ao inicializar banco de dados:', error);
      Alert.alert('Erro', 'Não foi possível inicializar o banco de dados: ' + error.message);
      throw error;
    } finally {
      if (db) {
        try {
          await db.close();
        } catch (closeError) {
          console.error('Erro ao fechar conexão com banco:', closeError);
        }
      }
    }
  };
  
  // Função para carregar os dados do idoso do SQLite
  const carregarDados = async () => {
    let db = null;
    try {
      db = await openDatabase();
      
      // Buscar o idoso mais recente
      const [result] = await db.executeSql(
        'SELECT * FROM idosos ORDER BY ultima_atualizacao DESC LIMIT 1'
      );
      
      if (result.rows.length > 0) {
        const idoso = result.rows.item(0);
        setNome(idoso.nome || '');
        setIdade(idoso.idade ? idoso.idade.toString() : '');
        setEndereco(idoso.endereco || '');
        setContatos(idoso.contatos || '');
        setDescricao(idoso.descricao || '');
        setImportante(idoso.importante || '');
        setAlergias(idoso.alergias || '');
        setDoencas(idoso.doencas || '');
        setObservacoes(idoso.observacoes || '');
        setDataCadastro(idoso.data_cadastro || null);
        setIdosoId(idoso.id);
      }
      return true;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados: ' + error.message);
      throw error;
    } finally {
      if (db) {
        try {
          await db.close();
        } catch (closeError) {
          console.error('Erro ao fechar conexão com banco:', closeError);
        }
      }
    }
  };

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

  // Função para salvar os dados do idoso no SQLite
  const salvarDados = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do idoso é obrigatório');
      return;
    }

    setIsSaving(true);
    let db = null;

    try {
      db = await openDatabase();
      const dataAtual = new Date().toISOString();

      if (idosoId) {
        // Atualizar idoso existente
        await db.executeSql(
          `UPDATE idosos SET 
            nome = ?, 
            idade = ?, 
            endereco = ?, 
            contatos = ?, 
            descricao = ?, 
            importante = ?, 
            alergias = ?, 
            doencas = ?, 
            observacoes = ?, 
            ultima_atualizacao = ?
          WHERE id = ?`,
          [
            nome,
            idade ? parseInt(idade) : null,
            endereco,
            contatos,
            descricao,
            importante,
            alergias,
            doencas,
            observacoes,
            dataAtual,
            idosoId
          ]
        );

        Alert.alert('Sucesso', 'Dados do idoso atualizados com sucesso!');
      } else {
        // Inserir novo idoso
        await db.executeSql(
          `INSERT INTO idosos (
            nome, 
            idade, 
            endereco, 
            contatos, 
            descricao, 
            importante, 
            alergias, 
            doencas, 
            observacoes, 
            data_cadastro, 
            ultima_atualizacao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nome,
            idade ? parseInt(idade) : null,
            endereco,
            contatos,
            descricao,
            importante,
            alergias,
            doencas,
            observacoes,
            dataAtual,
            dataAtual
          ]
        );

        Alert.alert('Sucesso', 'Novo idoso cadastrado com sucesso!');
      }

      // Fechar o modal e informar que um cadastro foi realizado
      onClose(true);
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      Alert.alert('Erro', 'Não foi possível salvar os dados: ' + error.message);
    } finally {
      if (db) {
        try {
          await db.close();
        } catch (closeError) {
          console.error('Erro ao fechar conexão com banco:', closeError);
        }
      }
      setIsSaving(false);
    }
  };

  const carregarIdosoPorId = async (id) => {
    let db = null;
    try {
      db = await openDatabase();

      const [result] = await db.executeSql(
        'SELECT * FROM idosos WHERE id = ?',
        [id]
      );

      if (result.rows.length > 0) {
        const idoso = result.rows.item(0);
        setNome(idoso.nome || '');
        setIdade(idoso.idade ? idoso.idade.toString() : '');
        setEndereco(idoso.endereco || '');
        setContatos(idoso.contatos || '');
        setDescricao(idoso.descricao || '');
        setImportante(idoso.importante || '');
        setAlergias(idoso.alergias || '');
        setDoencas(idoso.doencas || '');
        setObservacoes(idoso.observacoes || '');
        setDataCadastro(idoso.data_cadastro || null);
        setIdosoId(idoso.id);
      }
      return true;
    } catch (error) {
      console.error('Erro ao carregar dados do idoso:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do idoso: ' + error.message);
      throw error;
    } finally {
      if (db) {
        try {
          await db.close();
        } catch (closeError) {
          console.error('Erro ao fechar conexão com banco:', closeError);
        }
      }
    }
  };

  // Função para limpar o formulário
  const limparFormulario = () => {
    Alert.alert(
      'Limpar formulário',
      'Tem certeza que deseja limpar todos os campos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          onPress: () => {
            setNome('');
            setIdade('');
            setEndereco('');
            setContatos('');
            setDescricao('');
            setImportante('');
            setAlergias('');
            setDoencas('');
            setObservacoes('');
            // Não limpar o ID e a data de cadastro para manter o histórico
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Função para criar um novo cadastro
  const novoCadastro = () => {
    if (nome.trim() !== '' || idade !== '' || endereco.trim() !== '' || 
        contatos.trim() !== '' || descricao.trim() !== '' || 
        importante.trim() !== '' || alergias.trim() !== '' || 
        doencas.trim() !== '' || observacoes.trim() !== '') {
      Alert.alert(
        'Novo Cadastro',
        'Deseja criar um novo cadastro? Os dados não salvos serão perdidos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Criar Novo', 
            onPress: () => {
              setNome('');
              setIdade('');
              setEndereco('');
              setContatos('');
              setDescricao('');
              setImportante('');
              setAlergias('');
              setDoencas('');
              setObservacoes('');
              setDataCadastro(null);
              setIdosoId(null);
            }
          }
        ]
      );
    } else {
      setNome('');
      setIdade('');
      setEndereco('');
      setContatos('');
      setDescricao('');
      setImportante('');
      setAlergias('');
      setDoencas('');
      setObservacoes('');
      setDataCadastro(null);
      setIdosoId(null);
    }
  };

  // Função para excluir o cadastro
  const excluirCadastro = async () => {
    if (!idosoId) {
      Alert.alert('Aviso', 'Não há cadastro para excluir.');
      return;
    }

    Alert.alert(
      'Excluir cadastro',
      'Tem certeza que deseja excluir este cadastro? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          onPress: async () => {
            setIsLoading(true);
            let db = null;

            try {
              db = await openDatabase();
              
              // Excluir o idoso do banco de dados
              await db.executeSql('DELETE FROM idosos WHERE id = ?', [idosoId]);
              
              // Limpar todos os campos
              setNome('');
              setIdade('');
              setEndereco('');
              setContatos('');
              setDescricao('');
              setImportante('');
              setAlergias('');
              setDoencas('');
              setObservacoes('');
              setDataCadastro(null);
              setIdosoId(null);
              
              Alert.alert('Sucesso', 'Cadastro excluído com sucesso!');
              
              // Fechar o modal após excluir
              onClose(true);
            } catch (error) {
              console.error('Erro ao excluir cadastro:', error);
              Alert.alert('Erro', 'Não foi possível excluir o cadastro: ' + error.message);
            } finally {
              if (db) {
                await db.close();
              }
              setIsLoading(false);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Função para compartilhar os dados do idoso
  const compartilharDados = async () => {
    if (!nome) {
      Alert.alert('Aviso', 'Não há dados para compartilhar.');
      return;
    }

    try {
      // Formatar os dados para compartilhamento
      let mensagem = `INFORMAÇÕES DO IDOSO\n\n`;
      mensagem += `Nome: ${nome}\n`;
      if (idade) mensagem += `Idade: ${idade} anos\n`;
      if (endereco) mensagem += `Endereço: ${endereco}\n`;
      if (contatos) mensagem += `Contatos:\n${contatos}\n`;
      if (descricao) mensagem += `\nDescrição Geral:\n${descricao}\n`;
      if (importante) mensagem += `\nInformações Importantes:\n${importante}\n`;
      if (alergias) mensagem += `\nAlergias:\n${alergias}\n`;
      if (doencas) mensagem += `\nDoenças:\n${doencas}\n`;
      if (observacoes) mensagem += `\nObservações Adicionais:\n${observacoes}\n`;

      // Usar a API Share para compartilhar os dados
      await Share.share({
        message: mensagem,
        title: `Informações de ${nome}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar dados:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar os dados.');
    }
  };

  // Renderização do componente
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => onClose(false)}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {idosoId ? 'Editar Idoso' : 'Novo Idoso'}
        </Text>
        <View style={styles.headerRight}>
          {idosoId && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={excluirCadastro}
            >
              <Text style={styles.deleteButtonText}>Excluir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            {/* Campo Nome */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome*</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Nome completo"
                placeholderTextColor="#999"
              />
            </View>

            {/* Campo Idade */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Idade</Text>
              <TextInput
                style={styles.input}
                value={idade}
                onChangeText={setIdade}
                placeholder="Idade"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* Campo Endereço */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Endereço</Text>
              <TextInput
                style={styles.input}
                value={endereco}
                onChangeText={setEndereco}
                placeholder="Endereço completo"
                placeholderTextColor="#999"
                multiline
              />
            </View>

            {/* Campo Contatos */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contatos</Text>
              <TextInput
                style={styles.textArea}
                value={contatos}
                onChangeText={setContatos}
                placeholder="Telefones, e-mails, contatos de emergência..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Campo Descrição */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição Geral</Text>
              <TextInput
                style={styles.textArea}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Descrição geral do idoso..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Campo Informações Importantes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Informações Importantes</Text>
              <TextInput
                style={styles.textArea}
                value={importante}
                onChangeText={setImportante}
                placeholder="Informações importantes sobre o idoso..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Campo Alergias */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alergias</Text>
              <TextInput
                style={styles.textArea}
                value={alergias}
                onChangeText={setAlergias}
                placeholder="Alergias conhecidas..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Campo Doenças */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Doenças</Text>
              <TextInput
                style={styles.textArea}
                value={doencas}
                onChangeText={setDoencas}
                placeholder="Doenças e condições médicas..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Campo Observações */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Observações Adicionais</Text>
              <TextInput
                style={styles.textArea}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Observações adicionais..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Data de cadastro */}
            {dataCadastro && (
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  Data de cadastro: {new Date(dataCadastro).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}

            {/* Botões de ação */}
            // Substituir a seção de botões de ação
            {/* Botões de ação */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => onClose(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            
              <TouchableOpacity
                style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]}
                onPress={salvarDados}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
   header: {
    backgroundColor: '#4A90E2',
    padding: 15,
    alignItems: 'center',
  },
   headerTitle: {   
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4A90E2',
    padding: 15,
    elevation: 3,
    },
    backButton: {
      padding: 5,
    },
    backButtonText: {
      color: 'white',
      fontSize: 16,
    },
    headerRight: {
      width: 80,
      alignItems: 'flex-end',
    },
    deleteButton: {
      padding: 5,
    },
    deleteButtonText: {
      color: '#FF6B6B',
      fontSize: 16,
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
      color: '#4A90E2',
    },
    scrollView: {
      flex: 1,
    },
    formContainer: {
      padding: 15,
    },
    inputGroup: {
      marginBottom: 15,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
      color: '#333',
    },
    input: {
      backgroundColor: 'white',
      borderRadius: 5,
      padding: 10,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#DDD',
    },
    textArea: {
      backgroundColor: 'white',
      borderRadius: 5,
      padding: 10,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#DDD',
      minHeight: 100,
      textAlignVertical: 'top',
    },
    infoRow: {
      marginBottom: 15,
      padding: 10,
      backgroundColor: '#E8F4FD',
      borderRadius: 5,
    },
    infoText: {
      fontSize: 14,
      color: '#4A90E2',
    },
    // Adicionar ao StyleSheet
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 30,
    },
    button: {
      flex: 1,
      padding: 12,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 5,
      elevation: 2,
    },
    cancelButton: {
      backgroundColor: '#FF9800',
    },
    saveButton: {
      backgroundColor: '#4A90E2',
    },
    disabledButton: {
      backgroundColor: '#B0BEC5',
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
    },
    clearButton: {
      backgroundColor: '#FF9800',
    },
    newButton: {
      backgroundColor: '#4CAF50',
    },
    shareButton: {
      backgroundColor: '#9C27B0',
    },
    saveButton: {
      backgroundColor: '#4A90E2',
    },
    disabledButton: {
      backgroundColor: '#B0BEC5',
    },
    buttonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 14,
    },
  });
  
  export default CadastroIdoso;