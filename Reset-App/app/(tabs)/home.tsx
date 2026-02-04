import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Dimensions
} from 'react-native';

// Importações para PDF
import { copyAsync, documentDirectory, getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import { Asset } from "expo-asset";

// --- CORES OFICIAIS RESET ---
const RESET_COLORS = {
  primary: '#fd151b',    // Vermelho
  secondary: '#ffb30f',  // Amarelo
  typography: '#1e3572', // Azul Escuro
  whiteAlt: '#edeff1',   // Branco Sujo
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HomeScreen() {
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // Carregar o PDF "Default" (Survival Guide) ao iniciar
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const asset = Asset.fromModule(require('@/assets/pdfs/survival_guide.pdf'));
        await asset.downloadAsync();
        setPdfUri(asset.localUri || asset.uri);
      } catch (error) {
        console.error("Erro ao carregar PDF:", error);
      }
    };
    loadPdf();
  }, []);

  // Função para abrir o PDF
  const openPdf = async (fileName: string) => {
    if (!pdfUri) {
      Alert.alert("A carregar", "O documento ainda está a carregar, tenta novamente em instantes.");
      return;
    }

    try {
      if (Platform.OS === "web") {
        window.open(pdfUri);
        return;
      }

      const fileUri = `${documentDirectory}${fileName}.pdf`;
      await copyAsync({ from: pdfUri, to: fileUri });

      if (Platform.OS === "android") {
        const contentUri = await getContentUriAsync(fileUri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: "application/pdf",
        });
      } else {
        await WebBrowser.openBrowserAsync(fileUri);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível abrir o documento.");
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
    >
      {/* 1. LOGO EM GRANDE */}
      <Image 
        source={require('@/assets/images/reset-logo-extended.png')} 
        style={styles.heroLogo} 
        resizeMode="contain"
      />

      {/* TÍTULO DA SECÇÃO */}
      <View style={styles.headerContainer}>
        <Text style={styles.mainTitle}>OS DESAFIOS</Text>
        <View style={styles.underline} />
      </View>

      {/* 2. CARTÃO: CASE STUDY */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>CASE STUDY</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ESTRATÉGIA</Text>
          </View>
        </View>
        
        <Text style={styles.cardDescription}>
          Analisa um cenário real, identifica problemas cruciais e desenvolve uma solução estratégica inovadora. O foco está na viabilidade, criatividade e impacto da solução proposta.
        </Text>

        <TouchableOpacity 
          style={styles.pdfButton} 
          onPress={() => openPdf("Guião_CaseStudy")}
        >
          <Text style={styles.pdfButtonText}>VER GUIÃO (PDF)</Text>
        </TouchableOpacity>
      </View>

      {/* 3. CARTÃO: TECHNICAL DESIGN */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>TECHNICAL DESIGN</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ENGENHARIA</Text>
          </View>
        </View>

        <Text style={styles.cardDescription}>
          Projeta uma arquitetura técnica robusta para resolver um problema complexo. Deverás apresentar diagramas, escolhas tecnológicas e justificação das decisões de engenharia.
        </Text>

        <TouchableOpacity 
          style={styles.pdfButton} 
          onPress={() => openPdf("Guião_TechnicalDesign")}
        >
          <Text style={styles.pdfButtonText}>VER GUIÃO (PDF)</Text>
        </TouchableOpacity>
      </View>

      {/* Espaço extra no fundo */}
      <View style={{ height: 40 }} />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RESET_COLORS.secondary, // Fundo Amarelo
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  
  // --- HERO LOGO ---
  heroLogo: {
    width: SCREEN_WIDTH * 0.8,
    height: 120,
    marginTop: 40,
    marginBottom: 30,
  },

  // --- TÍTULO ---
  headerContainer: {
    width: '100%',
    marginBottom: 25,
  },
  mainTitle: {
    fontSize: 28,
    fontFamily: 'Archivo-Black',
    color: RESET_COLORS.primary, // Vermelho
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  underline: {
    width: 60,
    height: 4,
    backgroundColor: RESET_COLORS.typography, // Azul
    marginTop: 5,
  },

  // --- CARTÕES DE DESAFIO ---
  card: {
    width: '100%',
    backgroundColor: RESET_COLORS.typography, // Azul Escuro (Fundo do Card)
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Archivo-Black',
    color: '#FFF', // Título a Branco
    flex: 1,
  },
  badge: {
    backgroundColor: RESET_COLORS.secondary, // Amarelo
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Archivo-SemiBold',
    color: RESET_COLORS.typography, // Texto Azul no badge amarelo
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'NotoSans-Light',
    color: '#edeff1', // Branco sujo para leitura fácil
    lineHeight: 20,
    marginBottom: 20,
  },
  
  // --- BOTÃO PDF ---
  pdfButton: {
    backgroundColor: RESET_COLORS.primary, // Vermelho
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#FFF',
    fontFamily: 'Archivo-SemiBold',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});