import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Button,
  Alert,
  Dimensions,
} from 'react-native';
import SQLite from 'react-native-sqlite-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Habilitar promises para SQLite
SQLite.enablePromise(true);

// Dados iniciais padrão para novos idosos
const defaultData = [
  {
    title: 'Higiene Pessoal',
    items: ['Banho dado', 'Escovação dos dentes', 'Troca de roupas'],
  },
  {
    title: 'Medicação',
    items: ['Medicamentos da manhã', 'Aplicação de insulina'],
  },
];

export default function Checklist({idosoId, idosoNome = 'Idoso'}) {
  const [checkedItems, setCheckedItems] = useState({});
  const [sections, setSections] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newItem, setNewItem] = useState('');
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastResetDate, setLastResetDate] = useState(null);

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

  // Inicializar o banco de dados e carregar os dados
  useEffect(() => {
    const initDatabase = async () => {
      let db = null;
      try {
        db = await openDatabase();

        // Criar tabela de checklists se não existir
        await db.executeSql(`
            CREATE TABLE IF NOT EXISTS checklists (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              idoso_id INTEGER NOT NULL,
              data TEXT NOT NULL,
              FOREIGN KEY (idoso_id) REFERENCES idosos (id)
            )
          `);

        // Criar tabela de seções
        await db.executeSql(`
            CREATE TABLE IF NOT EXISTS checklist_sections (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              checklist_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              FOREIGN KEY (checklist_id) REFERENCES checklists (id)
            )
          `);

        // Criar tabela de itens
        await db.executeSql(`
            CREATE TABLE IF NOT EXISTS checklist_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              section_id INTEGER NOT NULL,
              item_text TEXT NOT NULL,
              is_checked INTEGER DEFAULT 0,
              FOREIGN KEY (section_id) REFERENCES checklist_sections (id)
            )
          `);

        // Carregar checklist do idoso
        await carregarChecklist(db);
      } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        Alert.alert(
          'Erro',
          'Falha ao inicializar o banco de dados: ' + error.message,
        );
        setIsLoading(false); // Garantir que o estado de carregamento seja atualizado mesmo em caso de erro
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

    initDatabase();
  }, [idosoId]);

  // Carregar checklist do idoso
  const carregarChecklist = async db => {
    setIsLoading(true);
    try {
      // Verificar se o idoso já tem uma checklist
      const [checklistResult] = await db.executeSql(
        'SELECT id FROM checklists WHERE idoso_id = ?',
        [idosoId],
      );

      let checklistId;

      if (checklistResult.rows.length === 0) {
        // Criar nova checklist para o idoso
        const [insertResult] = await db.executeSql(
          'INSERT INTO checklists (idoso_id, data) VALUES (?, datetime("now"))',
          [idosoId],
        );

        checklistId = insertResult.insertId;

        // Inserir dados padrão para o novo idoso
        for (const section of defaultData) {
          const [sectionResult] = await db.executeSql(
            'INSERT INTO checklist_sections (checklist_id, title) VALUES (?, ?)',
            [checklistId, section.title],
          );

          const sectionId = sectionResult.insertId;

          for (const item of section.items) {
            await db.executeSql(
              'INSERT INTO checklist_items (section_id, item_text) VALUES (?, ?)',
              [sectionId, item],
            );
          }
        }
      } else {
        checklistId = checklistResult.rows.item(0).id;
      }

      // Carregar seções e itens
      const [sectionsResult] = await db.executeSql(
        'SELECT * FROM checklist_sections WHERE checklist_id = ? ORDER BY id',
        [checklistId],
      );

      const loadedSections = [];
      const loadedCheckedItems = {};

      for (let i = 0; i < sectionsResult.rows.length; i++) {
        const section = sectionsResult.rows.item(i);

        const [itemsResult] = await db.executeSql(
          'SELECT * FROM checklist_items WHERE section_id = ? ORDER BY id',
          [section.id],
        );

        const items = [];

        for (let j = 0; j < itemsResult.rows.length; j++) {
          const item = itemsResult.rows.item(j);
          items.push({
            id: item.id,
            text: item.item_text,
          });

          if (item.is_checked === 1) {
            const key = `${section.title}-${item.item_text}`;
            loadedCheckedItems[key] = true;
          }
        }

        loadedSections.push({
          id: section.id,
          title: section.title,
          items: items,
        });
      }

      setSections(loadedSections);
      setCheckedItems(loadedCheckedItems);
    } catch (error) {
      console.error('Erro ao carregar checklist:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar a checklist: ' + error.message,
      );
      // Usar dados padrão em caso de erro
      setSections(
        defaultData.map((section, index) => ({
          id: index + 1, // ID temporário
          title: section.title,
          items: section.items.map((item, itemIndex) => ({
            id: (index + 1) * 100 + itemIndex, // ID temporário
            text: item,
          })),
        })),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar estado de um item (marcado/desmarcado)
  const salvarEstadoItem = async (sectionId, itemId, isChecked) => {
    let db = null;
    try {
      db = await openDatabase();
      await db.executeSql(
        'UPDATE checklist_items SET is_checked = ? WHERE id = ? AND section_id = ?',
        [isChecked ? 1 : 0, itemId, sectionId],
      );
    } catch (error) {
      console.error('Erro ao salvar estado do item:', error);
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

  const toggleItem = (sectionId, itemId, sectionTitle, itemText) => {
    const key = `${sectionTitle}-${itemText}`;
    const newCheckedState = !checkedItems[key];

    setCheckedItems(prev => ({...prev, [key]: newCheckedState}));
    salvarEstadoItem(sectionId, itemId, newCheckedState);
  };

  const addSection = async () => {
    if (!newSectionTitle.trim()) return;

    let db = null;
    try {
      db = await openDatabase();

      // Obter ID da checklist do idoso
      const [checklistResult] = await db.executeSql(
        'SELECT id FROM checklists WHERE idoso_id = ?',
        [idosoId],
      );

      if (checklistResult.rows.length === 0) {
        throw new Error('Checklist não encontrada para este idoso');
      }

      const checklistId = checklistResult.rows.item(0).id;

      // Inserir nova seção
      const [sectionResult] = await db.executeSql(
        'INSERT INTO checklist_sections (checklist_id, title) VALUES (?, ?)',
        [checklistId, newSectionTitle],
      );

      const newSectionId = sectionResult.insertId;

      // Atualizar estado
      setSections(prev => [
        ...prev,
        {
          id: newSectionId,
          title: newSectionTitle,
          items: [],
        },
      ]);

      setNewSectionTitle('');
      setModalVisible(false);
    } catch (error) {
      console.error('Erro ao adicionar seção:', error);
      Alert.alert(
        'Erro',
        'Não foi possível adicionar a seção: ' + error.message,
      );
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

  const addItemToSection = async (sectionId, sectionIndex) => {
    if (!newItem.trim()) return;

    let db = null;
    try {
      db = await openDatabase();

      // Inserir novo item
      const [itemResult] = await db.executeSql(
        'INSERT INTO checklist_items (section_id, item_text) VALUES (?, ?)',
        [sectionId, newItem],
      );

      const newItemId = itemResult.insertId;

      // Atualizar estado
      const updated = [...sections];
      updated[sectionIndex].items.push({
        id: newItemId,
        text: newItem,
      });

      setSections(updated);
      setNewItem('');
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert(
        'Erro',
        'Não foi possível adicionar o item: ' + error.message,
      );
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

  const deleteItem = async (sectionIndex, itemIndex) => {
    const itemId = sections[sectionIndex].items[itemIndex].id;

    let db = null;
    try {
      db = await openDatabase();

      // Excluir item do banco
      await db.executeSql('DELETE FROM checklist_items WHERE id = ?', [itemId]);

      // Atualizar estado
      const updated = [...sections];
      updated[sectionIndex].items.splice(itemIndex, 1);
      setSections(updated);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      Alert.alert('Erro', 'Não foi possível excluir o item: ' + error.message);
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

  const deleteSection = async index => {
    const sectionId = sections[index].id;

    let db = null;
    try {
      db = await openDatabase();

      // Excluir todos os itens da seção
      await db.executeSql('DELETE FROM checklist_items WHERE section_id = ?', [
        sectionId,
      ]);

      // Excluir a seção
      await db.executeSql('DELETE FROM checklist_sections WHERE id = ?', [
        sectionId,
      ]);

      // Atualizar estado
      const updated = [...sections];
      updated.splice(index, 1);
      setSections(updated);
    } catch (error) {
      console.error('Erro ao excluir seção:', error);
      Alert.alert('Erro', 'Não foi possível excluir a seção: ' + error.message);
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

  const resetChecklist = async () => {
    let db = null;
    try {
      setIsLoading(true);
      db = await openDatabase();

      // Atualizar todos os itens para desmarcados
      await db.executeSql(
        `UPDATE checklist_items SET is_checked = 0 
       WHERE section_id IN (
         SELECT cs.id FROM checklist_sections cs
         JOIN checklists c ON cs.checklist_id = c.id
         WHERE c.idoso_id = ?
       )`,
        [idosoId],
      );

      // Atualizar o estado local
      setCheckedItems({});

      // Salvar a data do reset
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`lastResetDate_${idosoId}`, today);
      setLastResetDate(today);

      Alert.alert('Sucesso', 'Checklist resetado com sucesso!');

      // Recarregar os dados
      await carregarChecklist(db);
    } catch (error) {
      console.error('Erro ao resetar checklist:', error);
      Alert.alert(
        'Erro',
        'Não foi possível resetar o checklist: ' + error.message,
      );
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

  // Função para agendar notificação com Notifee (1 minuto a partir de agora)
  const scheduleAlarm = async (title, message) => {
    try {
      // Importar notifee dinamicamente
      const notifee = require('@notifee/react-native').default;

      // Cria canal (necessário no Android)
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
      });

      const date = new Date(Date.now() + 60000); // 1 minuto no futuro

      // Criar trigger baseado em timestamp
      const trigger = {
        type: 1, // timestamp trigger
        timestamp: date.getTime(),
      };

      await notifee.createTriggerNotification(
        {
          title: title,
          body: message,
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
          },
        },
        trigger,
      );

      Alert.alert(
        'Sucesso',
        `Alarme agendado para: ${date.toLocaleTimeString()}`,
      );
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      Alert.alert(
        'Erro',
        'Não foi possível agendar a notificação: ' + error.message,
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando checklist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Checklist: {idosoNome}</Text>
      <View style={styles.buttonContainer}>
        <Button title="Nova Seção" onPress={() => setModalVisible(true)} />
        <Button
          title="Resetar Checklist"
          onPress={() => {
            Alert.alert(
              'Resetar Checklist',
              'Tem certeza que deseja desmarcar todos os itens?',
              [
                {
                  text: 'Cancelar',
                  style: 'cancel',
                },
                {
                  text: 'Sim, resetar',
                  onPress: resetChecklist,
                },
              ],
              {cancelable: true},
            );
          }}
          color="#FF6347" // Cor vermelha para indicar ação de cuidado
        />
      </View>
      <ScrollView>
        {sections.map((section, sectionIndex) => (
          <View
            key={section.id || section.title + sectionIndex}
            style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <TouchableOpacity onPress={() => deleteSection(sectionIndex)}>
                <Text style={styles.deleteButton}>🗑️</Text>
              </TouchableOpacity>
            </View>

            {section.items.map((item, itemIndex) => {
              const key = `${section.title}-${item.text}`;
              return (
                <View key={item.id || key} style={styles.item}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}
                    onPress={() =>
                      toggleItem(section.id, item.id, section.title, item.text)
                    }>
                    <Text
                      style={[
                        styles.checkbox,
                        checkedItems[key] && styles.checked,
                      ]}>
                      ✔
                    </Text>
                    <Text style={styles.itemText}>{item.text}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteItem(sectionIndex, itemIndex)}>
                    <Text style={styles.deleteItem}>❌</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={styles.addItemContainer}>
              <TextInput
                placeholder="Novo item..."
                value={sectionIndex === selectedSectionIndex ? newItem : ''}
                onChangeText={text => {
                  setSelectedSectionIndex(sectionIndex);
                  setNewItem(text);
                }}
                style={styles.input2}
              />
              <Button
                title="Adicionar"
                onPress={() => addItemToSection(section.id, sectionIndex)}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal para adicionar nova seção */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Nova Seção</Text>
            <TextInput
              placeholder="Título da seção"
              value={newSectionTitle}
              onChangeText={setNewSectionTitle}
              style={styles.input}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancelar" onPress={() => setModalVisible(false)} />
              <Button title="Adicionar" onPress={addSection} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    color: '#2196F3',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    textAlign: 'center',
    lineHeight: 22,
    marginRight: 10,
    color: 'transparent',
  },
  checked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    color: 'white',
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  deleteButton: {
    fontSize: 20,
    color: '#F44336',
  },
  deleteItem: {
    fontSize: 16,
    color: '#F44336',
    marginLeft: 10,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    width: '100%',
  },
  input2: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    width: Dimensions.get('window').width * 0.4,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
});
