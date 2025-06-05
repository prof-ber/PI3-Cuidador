import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import {Share} from 'react-native';

const Relatorio = () => {
  const [idosos, setIdosos] = useState([]);
  const [selectedIdoso, setSelectedIdoso] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState({
    observacoes: '',
    medicamentos: '',
    atividades: '',
    alimentacao: '',
    humor: '',
    data: new Date().toISOString().split('T')[0],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  // Carregar lista de idosos quando o componente for montado
  useEffect(() => {
    const carregarIdosos = async () => {
      setIsLoading(true);
      let db = null;

      try {
        db = await openDatabase();
        const [result] = await db.executeSql(
          'SELECT id, nome FROM idosos ORDER BY nome',
        );

        const idososArray = [];
        for (let i = 0; i < result.rows.length; i++) {
          idososArray.push(result.rows.item(i));
        }
        setIdosos(idososArray);
      } catch (error) {
        console.error('Erro ao carregar idosos:', error);
        Alert.alert('Erro', 'Não foi possível carregar os idosos.');
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

    carregarIdosos();
  }, []);

  // Função para solicitar permissão de armazenamento (necessário para Android)
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Permissão de Armazenamento',
            message:
              'O aplicativo precisa de acesso ao armazenamento para salvar o relatório em PDF.',
            buttonNeutral: 'Pergunte-me depois',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
  };

  // Função para gerar o PDF
  const generatePDF = async () => {
    if (!selectedIdoso) {
      Alert.alert('Erro', 'Selecione um idoso para gerar o relatório.');
      return;
    }

    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Erro', 'Permissão de armazenamento negada.');
      return;
    }

    setGeneratingPDF(true);

    try {
      // Formatar data para exibição
      const dataFormatada = new Date(reportData.data).toLocaleDateString(
        'pt-BR',
      );

      // Criar HTML para o PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body {
                font-family: Helvetica, Arial, sans-serif;
                padding: 20px;
              }
              h1 {
                color: #2c3e50;
                text-align: center;
                font-size: 24px;
                margin-bottom: 20px;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .section {
                margin-bottom: 20px;
              }
              .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #3498db;
                margin-bottom: 10px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
              }
              .content {
                font-size: 14px;
                line-height: 1.5;
              }
              .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #7f8c8d;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Relatório de Acompanhamento</h1>
              <p>Idoso: <strong>${selectedIdoso.nome}</strong></p>
              <p>Data: ${dataFormatada}</p>
            </div>
            
            <div class="section">
              <div class="section-title">Medicamentos</div>
              <div class="content">${
                reportData.medicamentos || 'Nenhuma informação registrada'
              }</div>
            </div>
            
            <div class="section">
              <div class="section-title">Alimentação</div>
              <div class="content">${
                reportData.alimentacao || 'Nenhuma informação registrada'
              }</div>
            </div>
            
            <div class="section">
              <div class="section-title">Atividades Realizadas</div>
              <div class="content">${
                reportData.atividades || 'Nenhuma informação registrada'
              }</div>
            </div>
            
            <div class="section">
              <div class="section-title">Humor/Estado Emocional</div>
              <div class="content">${
                reportData.humor || 'Nenhuma informação registrada'
              }</div>
            </div>
            
            <div class="section">
              <div class="section-title">Observações Adicionais</div>
              <div class="content">${
                reportData.observacoes || 'Nenhuma informação registrada'
              }</div>
            </div>
            
            <div class="footer">
              <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
              <p>Aplicativo PI3-Cuidador</p>
            </div>
          </body>
        </html>
      `;

      // Gerar o PDF
      const options = {
        html: htmlContent,
        fileName: `Relatorio_${selectedIdoso.nome}_${reportData.data.replace(
          /-/g,
          '_',
        )}`,
        directory: 'Documents',
      };

      const file = await RNHTMLtoPDF.convert(options);

      // Salvar o relatório no banco de dados
      await salvarRelatorio(file.filePath); // Fixed: was salvaRelatorio

      // Compartilhar o PDF
      await Share.share({
        url: Platform.OS === 'ios' ? file.filePath : `file://${file.filePath}`,
        title: `Relatório de ${selectedIdoso.nome}`,
      });

      Alert.alert(
        'Sucesso',
        `Relatório gerado com sucesso!\nSalvo em: ${file.filePath}`,
        [{text: 'OK', onPress: () => setModalVisible(false)}],
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert(
        'Erro',
        'Não foi possível gerar o relatório: ' + error.message,
      );
    } finally {
      setGeneratingPDF(false);
    }
  };
  // Função para salvar o relatório no banco de dados
  const salvarRelatorio = async filePath => {
    let db = null;

    try {
      db = await openDatabase();

      // Verificar se a tabela de relatórios existe, se não, criar
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS relatorios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          idoso_id INTEGER,
          data TEXT,
          observacoes TEXT,
          medicamentos TEXT,
          atividades TEXT,
          alimentacao TEXT,
          humor TEXT,
          arquivo_path TEXT,
          data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (idoso_id) REFERENCES idosos (id)
        )
      `);

      // Inserir o relatório
      await db.executeSql(
        `INSERT INTO relatorios (
          idoso_id, data, observacoes, medicamentos, atividades, alimentacao, humor, arquivo_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          selectedIdoso.id,
          reportData.data,
          reportData.observacoes,
          reportData.medicamentos,
          reportData.atividades,
          reportData.alimentacao,
          reportData.humor,
          filePath,
        ],
      );
    } catch (error) {
      console.error('Erro ao salvar relatório no banco:', error);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Relatório de Acompanhamento</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Seleção de idoso */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selecione o Idoso:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.idososList}>
              {idosos.map(idoso => (
                <TouchableOpacity
                  key={idoso.id}
                  style={[
                    styles.idosoItem,
                    selectedIdoso?.id === idoso.id && styles.selectedIdoso,
                  ]}
                  onPress={() => setSelectedIdoso(idoso)}>
                  <Text style={styles.idosoName}>{idoso.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Data do relatório */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data do Relatório:</Text>
            <TextInput
              style={styles.input}
              value={reportData.data}
              onChangeText={text => setReportData({...reportData, data: text})}
              placeholder="AAAA-MM-DD"
            />
          </View>

          {/* Campos do relatório */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicamentos:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={reportData.medicamentos}
              onChangeText={text =>
                setReportData({...reportData, medicamentos: text})
              }
              placeholder="Descreva os medicamentos administrados..."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alimentação:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={reportData.alimentacao}
              onChangeText={text =>
                setReportData({...reportData, alimentacao: text})
              }
              placeholder="Descreva a alimentação do dia..."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Atividades Realizadas:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={reportData.atividades}
              onChangeText={text =>
                setReportData({...reportData, atividades: text})
              }
              placeholder="Descreva as atividades realizadas..."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Humor/Estado Emocional:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={reportData.humor}
              onChangeText={text => setReportData({...reportData, humor: text})}
              placeholder="Descreva o humor e estado emocional..."
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações Adicionais:</Text>
            <TextInput
              style={styles.textArea}
              multiline
              value={reportData.observacoes}
              onChangeText={text =>
                setReportData({...reportData, observacoes: text})
              }
              placeholder="Observações adicionais..."
            />
          </View>

          {/* Botão para gerar relatório */}
          <TouchableOpacity
            style={styles.button}
            onPress={generatePDF}
            disabled={!selectedIdoso || generatingPDF}>
            <Text style={styles.buttonText}>
              {generatingPDF ? 'Gerando...' : 'Gerar Relatório PDF'}
            </Text>
            {generatingPDF && <ActivityIndicator color="#fff" />}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  idososList: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  idosoItem: {
    padding: 10,
    marginRight: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedIdoso: {
    backgroundColor: '#4A90E2',
  },
  idosoName: {
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 10,
  },
});

export default Relatorio;
