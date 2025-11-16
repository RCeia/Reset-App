import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// --- Corrected Import Strategy ---
// Import 'documentDirectory' as a named constant.
// Import the functions as named exports.
import {
  documentDirectory,
  copyAsync,
  getContentUriAsync,
} from "expo-file-system";
// --- End Corrected Import Strategy ---

import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import { Asset } from "expo-asset";

interface DateObj {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

const getCurrentDateTime = (): DateObj => {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
  };
};

const inicio: DateObj = { day: 7, month: 2, year: 2025, hours: 9, minutes: 0 };
const fim: DateObj = { day: 20, month: 2, year: 2025, hours: 21, minutes: 59 };

const isSpecialTime = (): boolean => {
  const current = getCurrentDateTime();
  const toMinutes = ({ year, month, day, hours, minutes }: DateObj) =>
    (((year * 12 + month) * 31 + day) * 24 + hours) * 60 + minutes;

  const inicioMin = toMinutes(inicio);
  const fimMin = toMinutes(fim);
  const currentMin = toMinutes(current);

  return currentMin >= inicioMin && currentMin <= fimMin;
};

// Define props interface for PdfButton
interface PdfButtonProps {
  title: string;
  pdfUri: string;
}

const PdfButton = ({ title, pdfUri }: PdfButtonProps) => {
  const openLocalPdf = async () => {
    try {
      if (Platform.OS === "web") {
        window.open(pdfUri);
      } else {
        // Use the named 'documentDirectory' constant
        const fileUri = `${documentDirectory}${title.replace(
          / /g,
          "_"
        )}.pdf`;

        // Use the named imports for functions
        await copyAsync({ from: pdfUri, to: fileUri });
        let contentUri: string = fileUri;

        if (Platform.OS === "android") {
          contentUri = await getContentUriAsync(fileUri);
          await IntentLauncher.startActivityAsync(
            "android.intent.action.VIEW",
            {
              data: contentUri,
              flags: 1,
              type: "application/pdf",
            }
          );
        } else {
          await WebBrowser.openBrowserAsync(contentUri);
        }
      }
    } catch (error) {
      console.error("Error opening PDF:", error); // Log the error
      Alert.alert("Erro", "Não foi possível abrir o PDF.");
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={openLocalPdf}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.4;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.8;

const events = [
  {
    id: "1",
    title: "Check-in + Coffee Break",
    startHour: 9,
    endHour: 10,
    color: "#1e3572",
  },
  { id: "2", title: "Workshops", startHour: 10, endHour: 12, color: "#ffb30f" },
  { id: "3", title: "Almoço", startHour: 12, endHour: 13, color: "#1e3572" },
  {
    id: "4",
    title: "Opening Ceremony",
    startHour: 13,
    endHour: 14.5,
    color: "#ffb30f",
  },
  {
    id: "5",
    title: "Topic Presentation",
    startHour: 14.5,
    endHour: 15.5,
    color: "#1e3572",
  },
  {
    id: "6",
    title: "Competition",
    startHour: 15.5,
    endHour: 23.99,
    color: "#fd151b",
  },
  { id: "7", title: "Jantar", startHour: 19.5, endHour: 20.5, color: "#1e3572" },
  {
    id: "8",
    title: "Desafio CS e Hackaton",
    startHour: 21,
    endHour: 23,
    color: "#ffb30f",
  },
];

// Add type for 'expanded' parameter
const getCurrentTimeBounds = (expanded: boolean) => {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  let startHour, endHour;
  if (expanded) {
    startHour = 0;
    endHour = 24;
  } else {
    startHour = Math.max(0, currentHour - 2);
    endHour = startHour + 8;
    if (endHour > 24) {
      endHour = 24;
      startHour = endHour - 12; // This logic seems to show 12 hours, not 8?
    }
  }

  startHour = Math.floor(startHour);
  endHour = Math.ceil(endHour);
  return { startHour, endHour };
};

// Add types for parameters
const getCurrentTimePosition = (
  startHour: number,
  endHour: number,
  height: number
) => {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return ((currentHour - startHour) / (endHour - startHour)) * height;
};

function EventSchedule() {
  const [expanded, setExpanded] = useState(false);
  const [scheduleHeight, setScheduleHeight] = useState(COLLAPSED_HEIGHT);
  const [timeBounds, setTimeBounds] = useState(getCurrentTimeBounds(false));

  const animatedHeight = useState(new Animated.Value(COLLAPSED_HEIGHT))[0];
  const animatedPosition = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: scheduleHeight,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [scheduleHeight, animatedHeight]);

  useEffect(() => {
    const { startHour, endHour } = timeBounds;
    Animated.timing(animatedPosition, {
      toValue: getCurrentTimePosition(startHour, endHour, scheduleHeight),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [timeBounds, scheduleHeight, animatedPosition]);

  const toggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    setScheduleHeight(newExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
    setTimeBounds(getCurrentTimeBounds(newExpanded));
  };

  return (
    <>
      <Animated.View
        style={[styles.scheduleContainer, { height: animatedHeight }]}
      >
        {Array.from({
          length: timeBounds.endHour - timeBounds.startHour + 1,
        }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.hourRow,
              {
                height:
                  scheduleHeight / (timeBounds.endHour - timeBounds.startHour),
              },
            ]}
          >
            <Text style={styles.hourText}>{`${Math.floor(
              i + timeBounds.startHour
            )}:00`}</Text>
          </View>
        ))}

        {events.map((event) => {
          if (
            event.endHour < timeBounds.startHour ||
            event.startHour > timeBounds.endHour
          )
            return null;

          const eventStart =
            ((event.startHour - timeBounds.startHour) /
              (timeBounds.endHour - timeBounds.startHour)) *
            scheduleHeight;

          const eventHeight =
            ((event.endHour - event.startHour) /
              (timeBounds.endHour - timeBounds.startHour)) *
            scheduleHeight;

          return (
            <View
              key={event.id}
              style={[
                styles.event,
                {
                  top: eventStart,
                  height: eventHeight,
                  backgroundColor: event.color,
                },
              ]}
            >
              <Text
                style={[
                  styles.eventText,
                  eventHeight < 30 ? { fontSize: 6 } : {},
                ]}
              >
                {event.title}
              </Text>
            </View>
          );
        })}

        <Animated.View
          style={[styles.timeIndicator, { top: animatedPosition }]}
        />
      </Animated.View>

      <TouchableOpacity onPress={toggleExpand} style={styles.toggleButton}>
        <Text style={styles.toggleText}>
          {expanded ? "Recolher Horário" : "Expandir Horário"}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const SurvivalGuideButton = () => {
  // Add explicit type for useState
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const asset = Asset.fromModule(
          require("../../assets/pdfs/survival_guide.pdf")
        );
        await asset.downloadAsync();
        setLocalUri(asset.localUri || asset.uri);
      } catch (error) {
        console.error("Failed to load survival guide:", error);
      }
    };
    loadPdf();
  }, []);

  return localUri ? (
    <PdfButton title="Survival Guide" pdfUri={localUri} />
  ) : (
    <Text style={styles.loadingText}>A carregar Survival Guide...</Text>
  );
};

const SpecialDocumentButtons = () => {
  // Add explicit type for useState
  const [docs, setDocs] = useState<{
    Documento1: string | null;
    Documento2: string | null;
  }>({
    Documento1: null,
    Documento2: null,
  });

  useEffect(() => {
    const loadPdfs = async () => {
      try {
        const doc1 = Asset.fromModule(
          require("@assets/pdfs/documento1.pdf")
        );
        const doc2 = Asset.fromModule(
          require("@assets/pdfs/documento2.pdf")
        );

        await doc1.downloadAsync();
        await doc2.downloadAsync();

        setDocs({
          Documento1: doc1.localUri || doc1.uri,
          Documento2: doc2.localUri || doc2.uri,
        });
      } catch (error) {
        console.error("Failed to load special documents:", error);
      }
    };

    loadPdfs();
  }, []);

  if (!isSpecialTime()) return null;
  if (!docs.Documento1 || !docs.Documento2)
    return <Text style={styles.loadingText}>A carregar documentos...</Text>;

  return (
    <View style={{ flexDirection: "row", gap: 10, alignSelf: "center" }}>
      <PdfButton title="Guião 1" pdfUri={docs.Documento1} />
      <PdfButton title="Guião 2" pdfUri={docs.Documento2} />
    </View>
  );
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <Text style={[styles.title, { color: themeColors.text }]}>
        Informações
      </Text>
      <EventSchedule />
      <SurvivalGuideButton />
      <SpecialDocumentButtons />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
  },
  button: {
    backgroundColor: "#FFB30F",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    marginVertical: 8,
    alignItems: "center",
    alignSelf: "center",
    width: "50%",
    minWidth: 150,
  },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  scheduleContainer: {
    width: "75%",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#ccc",
    position: "relative",
    overflow: "hidden",
    alignSelf: "center",
  },
  hourRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    justifyContent: "center",
    paddingLeft: 10,
  },
  hourText: { fontSize: 14, color: "#333" },
  event: {
    position: "absolute",
    left: 50,
    right: 10,
    borderRadius: 10,
    padding: 10,
    paddingVertical: 5,
    justifyContent: "center",
  },
  eventText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  timeIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "blue",
  },
  toggleButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#007bff",
    borderRadius: 10,
    width: "50%",
    minWidth: 150,
    alignSelf: "center",
    alignItems: "center",
  },
  toggleText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingText: {
    textAlign: "center",
    marginVertical: 10,
    fontSize: 16,
    color: "#888",
  },
});