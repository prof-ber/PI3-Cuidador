import React, {useState} from 'react';
import {
  View,
  Button,
  Alert,
  Platform,
  TextInput,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AlarmClock from 'react-native-alarm-clock';
import DateTimePicker from '@react-native-community/datetimepicker';

const ConfigureAlarmButton = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmName, setAlarmName] = useState('');
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alarms, setAlarms] = useState([]);

  const openAlarmModal = () => {
    setAlarmName('');
    setAlarmTime(new Date());
    setModalVisible(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setAlarmTime(selectedTime);
    }
  };

  const setAlarm = async () => {
    if (!alarmName.trim()) {
      Alert.alert('Erro', 'Por favor, dê um nome ao alarme.');
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        // Format time for the alarm
        await AlarmClock.createAlarm(alarmTime.toISOString(), alarmName);

        // Add to our local list of alarms
        const newAlarm = {
          id: Date.now().toString(),
          name: alarmName,
          time: alarmTime,
        };
        setAlarms([...alarms, newAlarm]);

        Alert.alert('Sucesso', 'Alarme criado com sucesso!');
        setModalVisible(false);
      } else {
        Alert.alert(
          'Indisponível',
          'A criação direta de alarmes não é suportada no iOS.',
        );
      }
    } catch (error) {
      console.error('Erro ao criar alarme:', error);
      Alert.alert('Erro', 'Não foi possível criar o alarme.');
    } finally {
      setLoading(false);
    }
  };

  const deleteAlarm = id => {
    // We can only manage our local list, not delete from the system
    setAlarms(alarms.filter(alarm => alarm.id !== id));
  };

  const formatTime = date => {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return `${hours}:${minutes} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      <Button
        title="Configurar Novo Alarme"
        onPress={openAlarmModal}
        disabled={loading}
      />

      {alarms.length > 0 && (
        <ScrollView style={styles.alarmList}>
          <Text style={styles.sectionTitle}>Alarmes Configurados</Text>
          {alarms.map(alarm => (
            <View key={alarm.id} style={styles.alarmItem}>
              <View>
                <Text style={styles.alarmName}>{alarm.name}</Text>
                <Text style={styles.alarmTime}>{formatTime(alarm.time)}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteAlarm(alarm.id)}>
                <Text style={styles.deleteButton}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Alarme</Text>

            <Text style={styles.inputLabel}>Nome do Alarme</Text>
            <TextInput
              style={styles.input}
              value={alarmName}
              onChangeText={setAlarmName}
              placeholder="Ex: Medicação da manhã"
            />

            <Text style={styles.inputLabel}>Horário do Alarme</Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={() => setShowTimePicker(true)}>
              <Text style={styles.timeText}>{formatTime(alarmTime)}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={alarmTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleTimeChange}
              />
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={setAlarm}
                disabled={loading}>
                <Text style={styles.buttonText}>
                  {loading ? 'Salvando...' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f1f1f1',
  },
  alarmList: {
    marginTop: 20,
    maxHeight: 300,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alarmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
  },
  alarmName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alarmTime: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  timeSelector: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 12,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ConfigureAlarmButton;
