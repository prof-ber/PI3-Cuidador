<<<<<<< HEAD
import React from 'react';
import Checklist from './lib/checklist';
import ConfigureAlarmButton from './lib/alarme';
import DailyAgenda from './lib/agenda';

export default function App() {
  return (
    <>
      <Checklist />
      <DailyAgenda />
      <ConfigureAlarmButton />
    </>
  );
}
=======
/**
 * Simple Firestore Test App
 */

import React, {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

import {Colors} from 'react-native/Libraries/NewAppScreen';

// First, you need to install these packages:
// npm install @react-native-firebase/app @react-native-firebase/firestore
import firestore from '@react-native-firebase/firestore';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [result, setResult] = useState<string>('No operations performed yet');
  const [documents, setDocuments] = useState<any[]>([]);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };

  // Function to add a document to Firestore
  const addDocument = async () => {
    try {
      const timestamp = firestore.Timestamp.now();

      const docRef = await firestore()
        .collection('tests')
        .add({
          message: 'Test document added at ' + new Date().toLocaleTimeString(),
          createdAt: timestamp,
        });

      setResult(`Document added with ID: ${docRef.id}`);
    } catch (error) {
      setResult(`Error adding document: ${error}`);
      console.error('Error adding document: ', error);
    }
  };

  // Function to query documents from Firestore
  const queryDocuments = async () => {
    try {
      const querySnapshot = await firestore()
        .collection('tests')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDocuments(docs);
      setResult(`Retrieved ${docs.length} documents`);
    } catch (error) {
      setResult(`Error querying documents: ${error}`);
      console.error('Error querying documents: ', error);
    }
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View style={styles.container}>
          <Text style={styles.title}>Firestore Test App</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={addDocument}>
              <Text style={styles.buttonText}>Add Document</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={queryDocuments}>
              <Text style={styles.buttonText}>Query Documents</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Result:</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>

          {documents.length > 0 && (
            <View style={styles.documentsContainer}>
              <Text style={styles.documentsTitle}>Retrieved Documents:</Text>
              {documents.map(doc => (
                <View key={doc.id} style={styles.documentItem}>
                  <Text style={styles.documentId}>ID: {doc.id}</Text>
                  <Text>Message: {doc.message}</Text>
                  <Text>
                    Created: {doc.createdAt?.toDate().toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
  },
  documentsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  documentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  documentItem: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  documentId: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default App;
>>>>>>> fc158537d7ef6b63267050e4c40ba62a2b3c6237
