import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Button,
  FlatList,
} from 'react-native';

export default function DailyAgenda() {
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    time: '',
    category: '',
  });

  const addTask = () => {
    const taskToAdd = {
      id: Date.now().toString(),
      ...newTask,
      completed: false,
    };
    setTasks(prev => [...prev, taskToAdd]);
    setModalVisible(false);
    setNewTask({title: '', description: '', time: '', category: ''});
  };

  const toggleTask = id => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? {...task, completed: !task.completed} : task,
      ),
    );
  };

  const deleteTask = id => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const renderItem = ({item}) => (
    <View style={styles.taskContainer}>
      <TouchableOpacity
        onPress={() => toggleTask(item.id)}
        style={styles.taskTextContainer}>
        <Text style={[styles.title, item.completed && styles.completed]}>
          {item.time} - {item.title}
        </Text>
        <Text style={styles.category}>{item.category}</Text>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => deleteTask(item.id)}>
        <Text style={styles.deleteButton}>❌</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.date}>Agenda do Dia</Text>

      <FlatList
        data={tasks.sort((a, b) => a.time.localeCompare(b.time))}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={{textAlign: 'center', marginTop: 20}}>
            Nenhuma tarefa ainda
          </Text>
        }
      />

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Nova Tarefa</Text>

          <TextInput
            placeholder="Título"
            value={newTask.title}
            onChangeText={text => setNewTask({...newTask, title: text})}
            style={styles.input}
            placeholderTextColor="#000"
          />
          <TextInput
            placeholder="Hora (ex: 08:00)"
            value={newTask.time}
            onChangeText={text => setNewTask({...newTask, time: text})}
            style={styles.input}
            placeholderTextColor="#000"
          />
          <TextInput
            placeholder="Categoria (ex: medicação, refeição, etc)"
            value={newTask.category}
            onChangeText={text => setNewTask({...newTask, category: text})}
            style={styles.input}
            placeholderTextColor="#000"
          />
          <TextInput
            placeholder="Descrição (opcional)"
            value={newTask.description}
            onChangeText={text => setNewTask({...newTask, description: text})}
            style={styles.input}
            placeholderTextColor="#000"
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 20,
            }}>
            <Button
              title="Cancelar"
              color="gray"
              onPress={() => setModalVisible(false)}
            />
            <Button title="Salvar" onPress={addTask} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  date: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  task: {
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ccc',
  },
  title: {
    fontSize: 16,
  },
  completed: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  category: {
    fontSize: 14,
    color: '#555',
  },
  description: {
    fontSize: 13,
    color: '#444',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#4CAF50',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 30,
  },
  modalContainer: {
    padding: 20,
    marginTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    backgroundColor: '#fff',
    color: '#000',
  },
});
