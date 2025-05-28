import React, {useState} from 'react';
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
} from 'react-native';

const initialData = [
  {
    title: 'Higiene Pessoal',
    items: ['Banho dado', 'Escovação dos dentes', 'Troca de roupas'],
  },
  {
    title: 'Medicação',
    items: ['Medicamentos da manhã', 'Aplicação de insulina'],
  },
];

export default function App() {
  const [checkedItems, setCheckedItems] = useState({});
  const [sections, setSections] = useState(initialData);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newItem, setNewItem] = useState('');
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);

  const toggleItem = (sectionTitle, item) => {
    const key = `${sectionTitle}-${item}`;
    setCheckedItems(prev => ({...prev, [key]: !prev[key]}));
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    setSections(prev => [...prev, {title: newSectionTitle, items: []}]);
    setNewSectionTitle('');
    setModalVisible(false);
  };

  const addItemToSection = index => {
    if (!newItem.trim()) return;
    const updated = [...sections];
    updated[index].items.push(newItem);
    setSections(updated);
    setNewItem('');
  };

  const deleteItem = (sectionIndex, itemIndex) => {
    const updated = [...sections];
    updated[sectionIndex].items.splice(itemIndex, 1);
    setSections(updated);
  };

  const deleteSection = index => {
    const updated = [...sections];
    updated.splice(index, 1);
    setSections(updated);
  };

  // Função para agendar notificação com Notifee (1 minuto a partir de agora)
  const scheduleAlarm = async (title, message) => {
    // Cria canal (necessário no Android)
    await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
    });

    const date = new Date(Date.now() + 60000); // 1 minuto no futuro

    await notifee.createTriggerNotification(
      {
        title: title,
        body: message,
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher', // ajuste se precisar o ícone
        },
      },
      trigger,
    );

    alert(`Alarme agendado para: ${date.toLocaleTimeString()}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Nova Seção" onPress={() => setModalVisible(true)} />
      <ScrollView>
        {sections.map((section, sectionIndex) => (
          <View key={section.title + sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <TouchableOpacity onPress={() => deleteSection(sectionIndex)}>
                <Text style={styles.deleteButton}>🗑️</Text>
              </TouchableOpacity>
            </View>

            {section.items.map((item, itemIndex) => {
              const key = `${section.title}-${item}`;
              return (
                <View key={key} style={styles.item}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
                    }}
                    onPress={() => toggleItem(section.title, item)}>
                    <Text
                      style={[
                        styles.checkbox,
                        checkedItems[key] && styles.checked,
                      ]}>
                      ✔
                    </Text>
                    <Text style={styles.itemText}>{item}</Text>
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
                style={styles.input}
              />
              <Button
                title="Adicionar"
                onPress={() => addItemToSection(sectionIndex)}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Adicionar Seção</Text>
          <TextInput
            placeholder="Título da seção"
            value={newSectionTitle}
            onChangeText={setNewSectionTitle}
            style={styles.input}
          />
          <Button title="Salvar" onPress={addSection} />
          <Button title="Cancelar" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', paddingTop: 20},
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  deleteButton: {marginLeft: 8, fontSize: 18},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#888',
    textAlign: 'center',
    marginRight: 10,
    fontSize: 16,
    color: 'transparent',
  },
  checked: {
    color: '#4CAF50',
  },
  itemText: {
    fontSize: 16,
    color: '#444',
    flex: 1,
  },
  deleteItem: {
    marginLeft: 10,
    fontSize: 16,
    color: '#900',
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
