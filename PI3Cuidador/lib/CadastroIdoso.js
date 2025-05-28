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
  Share,
  ToastAndroid
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

const CadastroIdoso = () => {
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
  const [dataCadastro, setDataCadastro] = useState(null);
  const [idosoId, setIdosoId] = useState(null); // Para rastrear o ID do idoso no banco

  // Carregar dados salvos quando o componente for montado
  // Carregar dados salvos quando o componente for montado
  useEffect(() => {
    const setup = async () => {
      setIsLoading(true);
      try {
        await inicializarBancoDeDados();
        await carregarDados();
      } catch (error) {
        console.error('Erro na inicialização:', error);
        Alert.alert('Erro', 'Ocorreu um erro ao inicializar o aplicativo: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    setup();
  }, []);
  
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
    // Validação básica
    if (!nome.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do idoso.');
      return;
    }

    setIsLoading(true);
    let db = null;

    try {
      db = await openDatabase();
      const agora = new Date().toISOString();

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
            nome.trim(),
            idade ? parseInt(idade) : null,
            endereco.trim(),
            contatos.trim(),
            descricao.trim(),
            importante.trim(),
            alergias.trim(),
            doencas.trim(),
            observacoes.trim(),
            agora,
            idosoId
          ]
        );
      } else {
        // Inserir novo idoso
        const [result] = await db.executeSql(
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
            nome.trim(),
            idade ? parseInt(idade) : null,
            endereco.trim(),
            contatos.trim(),
            descricao.trim(),
            importante.trim(),
            alergias.trim(),
            doencas.trim(),
            observacoes.trim(),
            agora,
            agora
          ]
        );
        
        // Guardar o ID do idoso recém-criado
        setIdosoId(result.insertId);
        setDataCadastro(agora);
      }

      // Mostrar mensagem de sucesso
      if (Platform.OS === 'android') {
        ToastAndroid.show('Cadastro salvo com sucesso!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Sucesso', 'Cadastro do idoso salvo com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      Alert.alert('Erro', 'Não foi possível salvar o cadastro: ' + error.message);
    } finally {
      if (db) {
        await db.close();
      }
      setIsLoading(false);
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

  // Formatar a data para exibição
  const formatarData = (dataString) => {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Cadastro de Idoso</Text>
        {dataCadastro && (
          <Text style={styles.dataCadastro}>
            Cadastrado em: {formatarData(dataCadastro)}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.formContainer}>
            {/* Dados Básicos */}
            <View style={styles.secaoContainer}>
              <Text style={styles.secaoTitulo}>Dados Básicos</Text>
              
              <Text style={styles.label}>Nome Completo*</Text>
              <TextInput
                style={styles.input}
                value={nome}
                onChangeText={setNome}
                placeholder="Digite o nome completo"
              />

              <Text style={styles.label}>Idade</Text>
              <TextInput
                style={styles.input}
                value={idade}
                onChangeText={(texto) => setIdade(texto.replace(/\D/g, ''))}
                placeholder="Digite a idade"
                keyboardType="numeric"
                maxLength={3}
              />

              <Text style={styles.label}>Endereço</Text>
              <TextInput
                style={styles.input}
                value={endereco}
                onChangeText={setEndereco}
                placeholder="Digite o endereço completo"
              />

              <Text style={styles.label}>Contatos</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contatos}
                onChangeText={setContatos}
                placeholder="Telefones e contatos de emergência"
                multiline={true}
                textAlignVertical="top"
              />
            </View>

            {/* Informações de Saúde */}
            <View style={styles.secaoContainer}>
              <Text style={styles.secaoTitulo}>Informações de Saúde</Text>
              
              <Text style={styles.label}>Descrição Geral</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Descrição geral do estado de saúde"
                multiline={true}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Informações Importantes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={importante}
                onChangeText={setImportante}
                placeholder="Informações críticas que devem ser conhecidas"
                multiline={true}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Alergias</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={alergias}
                onChangeText={setAlergias}
                placeholder="Liste as alergias conhecidas"
                multiline={true}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Doenças</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={doencas}
                onChangeText={setDoencas}
                placeholder="Liste as doenças crônicas ou condições médicas"
                multiline={true}
                textAlignVertical="top"
              />
            </View>

            {/* Observações */}
            <View style={styles.secaoContainer}>
              <Text style={styles.secaoTitulo}>Observações Adicionais</Text>
              
              <TextInput
                style={[styles.input, styles.textArea]}
                value={observacoes}
                onChangeText={setObservacoes}
                placeholder="Informações adicionais relevantes"
                multiline={true}
                textAlignVertical="top"
              />
            </View>

            {/* Botões de ação */}
            <View style={styles.botoesContainer}>
              <TouchableOpacity 
                style={[styles.botao, styles.botaoLimpar]} 
                onPress={limparFormulario}
              >
                <Text style={styles.botaoTexto}>Limpar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.botao, styles.botaoSalvar]} 
                onPress={salvarDados}
              >
                <Text style={styles.botaoTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>

            {/* Botões adicionais */}
            <View style={styles.botoesContainer}>
              <TouchableOpacity 
                style={[styles.botao, styles.botaoNovo]} 
                onPress={novoCadastro}
              >
                <Text style={styles.botaoTexto}>Novo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.botao, styles.botaoExcluir]} 
                onPress={excluirCadastro}
              >
                <Text style={styles.botaoTexto}>Excluir</Text>
              </TouchableOpacity>
            </View>

            {/* Botão de compartilhar */}
            <TouchableOpacity 
              style={[styles.botao, styles.botaoCompartilhar, { marginTop: 10 }]} 
              onPress={compartilharDados}
            >
              <Text style={styles.botaoTexto}>Compartilhar Informações</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  dataCadastro: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
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
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 15,
  },
  secaoContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#4A90E2',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  botao: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
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
  botaoExcluir: {
    backgroundColor: '#FF9800',
  },
  botaoCompartilhar: {
    backgroundColor: '#9C27B0',
    width: '100%',
  },
  botaoTexto: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default CadastroIdoso;