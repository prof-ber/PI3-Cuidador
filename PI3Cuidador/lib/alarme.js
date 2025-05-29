import React, {useState, useEffect} from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@alarms_data';

const ConfigureAlarmButton = () => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [alarmName, setAlarmName] = useState('');
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [alarms, setAlarms] = useState([]);

  // Load saved alarms on component mount
  useEffect(() => {
    loadAlarms();
  }, []);

  // Save alarms to AsyncStorage whenever they change
  useEffect(() => {
    saveAlarms();
  }, [alarms]);

  const loadAlarms = async () => {
    try {
      const savedAlarms = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedAlarms !== null) {
        // Convert stored string dates back to Date objects
        const parsedAlarms = JSON.parse(savedAlarms).map(alarm => ({
          ...alarm,
          time: new Date(alarm.time),
        }));
        setAlarms(parsedAlarms);
      }
    } catch (error) {
      console.error('Error loading alarms:', error);
    }
  };

  const saveAlarms = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      console.error('Error saving alarms:', error);
    }
  };

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
        // Generate a unique ID for the alarm
        const alarmId = Date.now();

        // Get the hour and minute from the date object
        const hour = alarmTime.getHours();
        const minute = alarmTime.getMinutes();

        // Log what we're trying to do
        console.log(`Creating alarm: ${alarmName} at ${hour}:${minute}`);

        let success = false;

        // Try approach 1: Object parameter (newer versions)
        try {
          console.log('Trying approach 1: Object parameter');
          await AlarmClock.createAlarm({
            hour: hour,
            minutes: minute,
            message: alarmName,
          });
          success = true;
          console.log('Approach 1 succeeded');
        } catch (error1) {
          console.log('Approach 1 failed:', error1);

          // Try approach 2: Individual parameters
          try {
            console.log('Trying approach 2: Individual parameters');
            await AlarmClock.createAlarm(hour, minute, alarmName);
            success = true;
            console.log('Approach 2 succeeded');
          } catch (error2) {
            console.log('Approach 2 failed:', error2);

            // Try approach 3: Your original approach
            try {
              console.log('Trying approach 3: Original approach');
              await AlarmClock.createAlarm(alarmTime.toISOString(), alarmName, {
                id: alarmId.toString(),
              });
              success = true;
              console.log('Approach 3 succeeded');
            } catch (error3) {
              console.log('Approach 3 failed:', error3);

              // Try approach 4: Simplified original approach
              try {
                console.log('Trying approach 4: Simplified original');
                await AlarmClock.createAlarm(
                  alarmTime.toISOString(),
                  alarmName,
                );
                success = true;
                console.log('Approach 4 succeeded');
              } catch (error4) {
                console.log('Approach 4 failed:', error4);
                throw new Error('All approaches failed');
              }
            }
          }
        }

        if (success) {
          // Add to our local list of alarms
          const newAlarm = {
            id: alarmId.toString(),
            name: alarmName,
            time: alarmTime,
          };
          setAlarms([...alarms, newAlarm]);

          Alert.alert('Sucesso', 'Alarme criado com sucesso!');
          setModalVisible(false);
        }
      } else {
        Alert.alert(
          'Indisponível',
          'A criação direta de alarmes não é suportada no iOS.',
        );
      }
    } catch (error) {
      console.error('Erro ao criar alarme:', error);

      // Provide a more helpful error message with an option to open the alarm app
      Alert.alert(
        'Erro',
        'Não foi possível criar o alarme automaticamente. Deseja abrir o aplicativo de relógio para criar manualmente?',
        [
          {
            text: 'Sim',
            onPress: () => {
              try {
                AlarmClock.openAlarms();
              } catch (openError) {
                console.error('Erro ao abrir alarmes:', openError);
                Alert.alert(
                  'Erro',
                  'Não foi possível abrir o aplicativo de relógio.',
                );
              }
            },
          },
          {
            text: 'Não',
            style: 'cancel',
          },
        ],
      );
    } finally {
      setLoading(false);
    }
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
