import React, {useState} from 'react';
import {
  TouchableOpacity,
  Text,
  Alert,
  Linking,
  StyleSheet,
  View,
} from 'react-native';

const phoneCall = number => {
  const sanitizedNumber = number.trim();
  const url = `tel:${sanitizedNumber}`;

  Linking.canOpenURL(url)
    .then(supported => {
      if (!supported) {
        Alert.alert('Erro', 'Discagem não suportada neste dispositivo.');
      } else {
        return Linking.openURL(url);
      }
    })
    .catch(err => {
      Alert.alert('Erro', 'Ocorreu um problema ao tentar discar.');
      console.error(err);
    });
};

const EmergencyPanel = () => {
  const [showNumbers, setShowNumbers] = useState(false);

  // Números fixos aqui
  const numbers = [
    {label: 'SAMU', number: '192'},
    {label: 'Polícia', number: '190'},
    {label: 'Bombeiros', number: '193'},
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.showButton}
        onPress={() => setShowNumbers(prev => !prev)}>
        <Text style={styles.showButtonText}>
          {showNumbers ? 'Ocultar Números' : 'Mostrar Números de Emergência'}
        </Text>
      </TouchableOpacity>

      {showNumbers &&
        numbers.map(({label, number}) => (
          <View key={label} style={styles.numberRow}>
            <Text style={styles.numberText}>
              {label}: {number}
            </Text>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => phoneCall(number)}>
              <Text style={styles.callButtonText}>Ligar</Text>
            </TouchableOpacity>
          </View>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  showButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  showButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  numberText: {
    flex: 1,
    fontSize: 16,
  },
  callButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EmergencyPanel;
