import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import EmergencyPanel from './lib/call';
import ListaIdosos from './lib/ListaIdosos';
import CadastroIdoso from './lib/CadastroIdoso';

// Definindo interfaces para as props dos componentes
interface ListaIdososProps {
  onIdosoSelecionado: (idosoId: number) => void;
  refreshKey: number; // Adicionando uma prop para forçar atualização
}

interface CadastroIdosoProps {
  idosoId: number | null;
  onClose: (cadastroRealizado: boolean) => void; // Modificado para informar se houve cadastro
}

const HomeScreen = () => {
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [showCadastroIdoso, setShowCadastroIdoso] = useState(false);
  const [idosoSelecionadoId, setIdosoSelecionadoId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Estado para forçar atualização da lista

  const handleQuickDial = () => {
    setShowEmergencyPanel(true);
  };

  const handleAdicionarIdoso = () => {
    setIdosoSelecionadoId(null); // Garantir que estamos criando um novo idoso
    setShowCadastroIdoso(true);
  };

  const handleIdosoSelecionado = (idosoId: number) => {
    setIdosoSelecionadoId(idosoId);
    setShowCadastroIdoso(true);
  };

  const handleCloseCadastro = useCallback((cadastroRealizado: boolean = false) => {
    setShowCadastroIdoso(false);
    setIdosoSelecionadoId(null);
    
    // Se um cadastro foi realizado (novo ou atualização), atualiza a lista
    if (cadastroRealizado) {
      setRefreshKey(prevKey => prevKey + 1); // Incrementa a chave para forçar atualização
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Idosos</Text>
      </View>

      {/* Content Area - Lista de Idosos */}
      <View style={styles.content}>
        <ListaIdosos 
          onIdosoSelecionado={handleIdosoSelecionado} 
          refreshKey={refreshKey} // Passando a chave de atualização
        />
      </View>

      {/* Emergency Panel Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEmergencyPanel}
        onRequestClose={() => setShowEmergencyPanel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEmergencyPanel(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
            <EmergencyPanel />
          </View>
        </View>
      </Modal>

      {/* Cadastro Idoso Modal */}
      <Modal
        animationType="slide"
        visible={showCadastroIdoso}
        onRequestClose={() => handleCloseCadastro(false)}
      >
        <CadastroIdoso 
          idosoId={idosoSelecionadoId}
          onClose={handleCloseCadastro}
        />
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.footerButton} 
          onPress={handleQuickDial}
        >
          <Text style={styles.iconText}>📞</Text>
          <Text style={styles.footerButtonText}>Discagem Rápida</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.footerButton} 
          onPress={handleAdicionarIdoso}
        >
          <Text style={styles.iconText}>👤+</Text>
          <Text style={styles.footerButtonText}>Adicionar Idoso</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 60,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  footer: {
    height: 70,
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  footerButtonText: {
    color: '#FFFFFF',
    marginTop: 4,
    fontSize: 12,
  },
  iconText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A90E2',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default HomeScreen;