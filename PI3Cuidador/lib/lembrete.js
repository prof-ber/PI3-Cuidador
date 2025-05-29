import React, {useState} from 'react';
import {
  View,
  Button,
  Alert,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Text,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as AddCalendarEvent from 'react-native-add-calendar-event';

const Reminder = () => {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('date'); // 'date' or 'time'

  // Separate function to handle showing the picker
  const showDatepicker = () => {
    setShowPicker(true);
    setMode('date');
  };

  // Handle date change with proper null checks
  const handleChangeDate = selectedDate => {
    // Hide the picker immediately for Android
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    // Only update if we have a valid selection
    if (selectedDate !== undefined) {
      setDate(selectedDate);

      // For iOS, if we're in date mode, show time picker next
      if (Platform.OS === 'ios' && mode === 'date') {
        setMode('time');
      } else {
        // Otherwise close the picker
        setShowPicker(false);
      }
    } else {
      // If no date was selected (user canceled), just close the picker
      setShowPicker(false);
    }
  };

  const requestCalendarPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_CALENDAR,
          PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
        ]);

        const readGranted =
          granted['android.permission.READ_CALENDAR'] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const writeGranted =
          granted['android.permission.WRITE_CALENDAR'] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (!readGranted || !writeGranted) {
          Alert.alert(
            'Permissão negada',
            'Não foi possível obter permissão para acessar o calendário.',
          );
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Error requesting calendar permission:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  const openCalendar = async () => {
    try {
      // Check permissions first
      const hasPermission = await requestCalendarPermission();
      if (!hasPermission) {
        return;
      }

      // Validate the date
      const now = new Date();
      if (date <= now) {
        Alert.alert('Erro', 'Por favor, selecione uma data futura.');
        return;
      }

      // Calculate end time (30 minutes after start)
      const endTime = new Date(date.getTime() + 30 * 60000);

      // Format dates properly for the calendar
      const utcStartDate = date.toISOString();
      const utcEndDate = endTime.toISOString();

      const eventConfig = {
        title: 'Consulta Médica',
        startDate: utcStartDate,
        endDate: utcEndDate,
        notes: 'Lembrete: consulta médica agendada',
        location: '',
        allDay: false,
      };

      console.log('Opening calendar with config:', eventConfig);

      // Use the correct method from the package
      const result = await AddCalendarEvent.presentEventCreatingDialog(
        eventConfig,
      );

      console.log('Calendar result:', result);

      // Handle the result
      if (result && result.action === 'SAVED') {
        Alert.alert('Sucesso', 'Evento adicionado ao calendário!');
      } else if (result && result.action === 'CANCELED') {
        Alert.alert('Cancelado', 'Você cancelou a criação do evento.');
      }
    } catch (error) {
      console.error('Calendar error:', error);
      Alert.alert(
        'Erro',
        'Não foi possível abrir o calendário: ' +
          (error.message || 'Erro desconhecido'),
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Agendar Consulta</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações da Consulta</Text>
          <Text style={styles.dateText}>
            Data selecionada: {date.toLocaleDateString()}{' '}
            {date.toLocaleTimeString()}
          </Text>

          <Button title="Selecionar data e hora" onPress={showDatepicker} />
        </View>

        {showPicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode={mode}
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChangeDate}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adicionar ao Calendário</Text>
          <Text style={styles.infoText}>
            Adicione esta consulta ao seu calendário para receber lembretes.
          </Text>
          <Button
            title="Abrir Calendário para criar evento"
            onPress={openCalendar}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Instruções</Text>
          <Text style={styles.infoText}>
            1. Selecione a data e hora da consulta{'\n'}
            2. Adicione ao calendário para receber lembretes{'\n'}
            3. Preencha os detalhes adicionais no calendário se necessário
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  dateText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#555',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 16,
  },
});

export default Reminder;
