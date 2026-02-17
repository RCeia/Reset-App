import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Modal, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BASE_URL } from '@/constants/Config';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONSTANTES GLOBAIS (Isto pode ficar fora) ---
const PIPE_CAP_IMG = require('@/assets/images/pipe_cap.png');
const PIPE_BODY_IMG = require('@/assets/images/pipe_body.png');
const BIRD_IMG = require('../../assets/images/bird_teste2.png');
const BACKGROUND_IMG = require('../../assets/images/fundo_teste.png');
const { width, height } = Dimensions.get('window');

// --- Configurações do Pássaro e Canos ---
const birdSource = Image.resolveAssetSource(BIRD_IMG);
const BIRD_SCALE = 0.025;
const BIRD_WIDTH = birdSource.width * BIRD_SCALE;
const BIRD_HEIGHT = birdSource.height * BIRD_SCALE;
const BIRD_X_POSITION = width * 0.22;

const capSource = Image.resolveAssetSource(PIPE_CAP_IMG);
const PIPE_SCALE = 0.1;
const OBSTACLE_WIDTH = capSource.width * PIPE_SCALE;
const CAP_HEIGHT = capSource.height * PIPE_SCALE;

const OBSTACLE_GAP = 165;
const OBSTACLE_SPEED = 2.28;
const OBSTACLE_SPACING = width * 0.73;
const GRAVITY = 0.25;
const JUMP_VELOCITY = -5.9;

const ASSETS_TO_LOAD = [
  require('../../assets/images/bird_teste2.png'),
  require('@/assets/images/pipe_cap.png'),
  require('@/assets/images/pipe_body.png'),
  BACKGROUND_IMG,
];

/**
 * Funções auxiliares puras (sem hooks) podem ficar fora
 */
const getRandomObstacleHeight = () => {
  return Math.random() * (height - OBSTACLE_GAP - 100) + 50;
};

const createObstacle = (x: number, id: number) => ({
  id,
  x,
  height: getRandomObstacleHeight(),
  passed: false,
});

// ==========================================================
// COMPONENTE PRINCIPAL (Tudo o que tem 'use' fica aqui dentro!)
// ==========================================================
export default function FlappyScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  // --- 1. HOOKS DE ESTADO (TUDO NO TOPO) ---
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{ username: string, score: number }[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
  const [gameState, setGameState] = useState({
    birdY: height / 2,
    obstacles: [createObstacle(width, 1)],
    score: 0,
  });

  // --- 2. REFS (MEMÓRIA DO JOGO) ---
  const birdY = useRef(height / 2);
  const birdVelocity = useRef(0);
  const obstacles = useRef(gameState.obstacles);
  const score = useRef(0);
  const nextObstacleId = useRef(2);
  const frameId = useRef<number | null>(null);
  const lastFrameTime = useRef(Date.now());
  const accumulator = useRef(0);

  // --- 3. FUNÇÕES LÓGICAS (DEFINIDAS DENTRO DO COMPONENTE) ---
  
  // Função para buscar Ranking
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/score/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Erro ao carregar ranking:", error);
    }
  };

  // Função para salvar Score
  const saveHighScore = async (finalScore: number) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;

      const url = `${BASE_URL}/api/score/update`;
      console.log("A enviar para:", url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: finalScore }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`ERRO ${response.status}:`, errorText);
        return;
      }
      const data = await response.json();
      console.log("SUCESSO:", data.message);

      // Atualiza o ranking logo após salvar!
      fetchLeaderboard();

    } catch (error) {
      console.error("ERRO NO JOGO:", error);
    }
  };

  const handleJump = () => {
    if (!gameStarted) setGameStarted(true);
    if (gameOver) return;
    birdVelocity.current = JUMP_VELOCITY;
  };

  const resetGame = () => {
    const firstObstacle = [createObstacle(width, 1)];
    birdY.current = height / 2;
    birdVelocity.current = 0;
    obstacles.current = firstObstacle;
    score.current = 0;
    nextObstacleId.current = 2;

    setGameState({
      birdY: height / 2,
      obstacles: firstObstacle,
      score: 0,
    });

    setGameOver(false);
    setGameStarted(false);
    // Ao resetar, vamos buscar o ranking novamente
    fetchLeaderboard();
  };

  // --- 4. USE EFFECTS (EFEITOS COLATERAIS) ---

  // Carregar Assets (Só corre uma vez)
  useEffect(() => {
    const loadAssets = async () => {
      try {
        await Promise.all(ASSETS_TO_LOAD.map(img => Asset.fromModule(img).downloadAsync()));
      } catch (e) {
        console.warn("Erro ao carregar assets:", e);
      } finally {
        setIsAssetsLoaded(true);
      }
    };
    loadAssets();
  }, []);

  // Carregar Ranking Inicial
  useEffect(() => {
    if (!gameStarted) {
      fetchLeaderboard();
    }
  }, [gameStarted]);

  // Game Loop (O coração do jogo)
  useEffect(() => {
    if (!gameStarted || gameOver) {
      if (frameId.current) cancelAnimationFrame(frameId.current);
      return;
    }

    const FPS = 60;
    const TIME_STEP = 1000 / FPS; // 16.66ms cravados
    
    // Reseta os relógios sempre que o jogo arranca
    lastFrameTime.current = Date.now();
    accumulator.current = 0;

    const gameLoop = () => {
      const now = Date.now();
      let deltaTime = now - lastFrameTime.current;
      
      // Bloqueio de Segurança: Se a app travar (ou for minimizada), impede que o deltaTime seja gigante
      if (deltaTime > 250) deltaTime = 250; 
      
      lastFrameTime.current = now;
      accumulator.current += deltaTime;

      let isGameOver = false;
      let physicsUpdated = false;
      let newScore = score.current;
      let newObstacles = obstacles.current;

      // --- O SEGREDO DOS JOGOS: O WHILE LOOP ---
      // Vai calcular a física o número de vezes necessárias para acompanhar o tempo real
      while (accumulator.current >= TIME_STEP) {
        // 1. Bird Physics
        birdVelocity.current += GRAVITY;
        birdY.current += birdVelocity.current;

        if (birdY.current + BIRD_HEIGHT >= height || birdY.current <= 0) {
          isGameOver = true;
        }

        // 2. Obstacles
        let tempObstacles = [];
        for (const obs of newObstacles) {
          const newX = obs.x - OBSTACLE_SPEED;

          // Colisões
          const birdLeft = BIRD_X_POSITION;
          const birdRight = BIRD_X_POSITION + BIRD_WIDTH;
          const obstacleLeft = newX;
          const obstacleRight = newX + OBSTACLE_WIDTH;
          const isCollidingX = birdRight > obstacleLeft && birdLeft < obstacleRight;

          const topObstacleBottom = obs.height;
          const bottomObstacleTop = obs.height + OBSTACLE_GAP;
          const isCollidingY = birdY.current < topObstacleBottom || (birdY.current + BIRD_HEIGHT) > bottomObstacleTop;

          if (isCollidingX && isCollidingY) {
            isGameOver = true;
          }

          // Pontuação
          const obstacleBackEdge = newX + OBSTACLE_WIDTH;
          const birdCenterX = BIRD_X_POSITION + BIRD_WIDTH / 2;
          if (obstacleBackEdge < birdCenterX && !obs.passed) {
            newScore++;
            obs.passed = true;
          }

          if (newX > -OBSTACLE_WIDTH) {
            tempObstacles.push({ ...obs, x: newX });
          }
        }

        // Add New Obstacle
        const lastObstacle = tempObstacles[tempObstacles.length - 1];
        if (lastObstacle && lastObstacle.x < width - OBSTACLE_SPACING) {
          tempObstacles.push(createObstacle(width, nextObstacleId.current));
          nextObstacleId.current++;
        }

        newObstacles = tempObstacles;
        
        // Remove 16.66ms do acumulador e regista que a física mexeu
        accumulator.current -= TIME_STEP;
        physicsUpdated = true;

        if (isGameOver) break; // Sai do while imediatamente se perder
      }

      // --- RENDERIZAÇÃO (O GRANDE TRUQUE DO ANDROID ANTIGO) ---
      // Só gastamos processamento a "pintar" o ecrã se a física realmente andou para a frente!
      if (physicsUpdated) {
        obstacles.current = newObstacles;
        score.current = newScore;

        setGameState({
          birdY: birdY.current,
          obstacles: newObstacles,
          score: newScore,
        });
      }

      if (isGameOver) {
        setGameOver(true);
        saveHighScore(score.current);
      } else {
        frameId.current = requestAnimationFrame(gameLoop);
      }
    };

    frameId.current = requestAnimationFrame(gameLoop);

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [gameStarted, gameOver]);

  // --- 5. O RETURN CONDICIONAL (SÓ AGORA!) ---
  if (!isAssetsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  // --- 6. RENDER FINAL ---
  return (
    <View style={styles.container}>
      <Image
        source={BACKGROUND_IMG}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: width,
          height: height,
          zIndex: -10
        }}
        resizeMode="cover"
      />

      {/* MENU INICIAL COM TOP 10 */}
      {!gameStarted && !gameOver && (
        <View style={styles.menuContainer}>
          <Text style={[styles.leaderboardTitle, { color: themeColors.text }]}>🏆 TOP PLAYERS</Text>

          <View style={styles.leaderboardTable}>
            <View style={[styles.tableRow, { borderBottomWidth: 2, borderBottomColor: themeColors.tint }]}>
              <Text style={[styles.rankText, { color: themeColors.tint }]}>#</Text>
              <Text style={[styles.userText, { fontWeight: 'bold' }]}>Utilizador</Text>
              <Text style={[styles.scoreText, { color: themeColors.tint }]}>Score</Text>
            </View>

            {leaderboard.length > 0 ? (
              leaderboard.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                  <Text style={styles.userText}>{item.username}</Text>
                  <Text style={styles.scoreText}>{item.score}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.loadingText}>A carregar ranking...</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: themeColors.tint }]}
            onPress={() => setGameStarted(true)}
          >
            <Text style={styles.buttonText}>JOGAR NOVO JOGO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ÁREA DE JOGO */}
      {gameStarted && (
        <TouchableOpacity style={styles.gameArea} activeOpacity={1} onPress={handleJump}>
          
          {/* Bird */}
          <Image
            source={require('../../assets/images/bird_teste2.png')}
            style={[styles.bird, { top: gameState.birdY }]}
            resizeMode="contain"
          />

          {/* Obstacles */}
          {gameState.obstacles.map(obs => (
            <React.Fragment key={obs.id}>
              {/* Cano Cima */}
              <View style={{
                position: 'absolute',
                left: obs.x,
                width: OBSTACLE_WIDTH,
                height: obs.height,
                overflow: 'hidden'
              }}>
                <Image
                  source={PIPE_BODY_IMG}
                  style={{
                    width: '100%',
                    flex: 1,
                    marginBottom: -(CAP_HEIGHT / 2),
                    zIndex: 1,
                  }}
                  resizeMode="stretch"
                />
                <Image
                  source={PIPE_CAP_IMG}
                  style={{
                    width: '100%',
                    height: CAP_HEIGHT,
                    zIndex: 10,
                  }}
                  resizeMode="contain"
                />
              </View>

              {/* Cano Baixo */}
              <View style={{
                position: 'absolute',
                left: obs.x,
                top: obs.height + OBSTACLE_GAP,
                width: OBSTACLE_WIDTH,
                height: height - obs.height - OBSTACLE_GAP,
                overflow: 'hidden'
              }}>
                <Image
                  source={PIPE_CAP_IMG}
                  style={{
                    width: '100%',
                    height: CAP_HEIGHT,
                    zIndex: 10,
                  }}
                  resizeMode="contain"
                />
                <Image
                  source={PIPE_BODY_IMG}
                  style={{
                    width: '100%',
                    flex: 1,
                    marginTop: -(CAP_HEIGHT / 2),
                    zIndex: 1
                  }}
                  resizeMode="stretch"
                />
              </View>
            </React.Fragment>
          ))}

          {/* Score */}
          <Text style={[styles.score, { color: themeColors.text }]}>Score: {gameState.score}</Text>

          {/* Game Over */}
          {gameOver && (
            <View style={styles.gameOverContainer}>
              <Text style={[styles.gameOverText, { color: themeColors.text }]}>Game Over</Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.tint }]} onPress={resetGame}>
                <Text style={styles.buttonText}>Restart</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  // Estilos do Menu / Leaderboard
  menuContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 20, // Garante que fica acima de tudo
  },
  leaderboardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  leaderboardTable: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rankText: { width: 35, fontWeight: 'bold', fontSize: 16 },
  userText: { flex: 1, fontSize: 16 },
  scoreText: { fontWeight: 'bold', fontSize: 16 },
  loadingText: { textAlign: 'center', padding: 20, color: '#888' },
  playButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 3,
  },
  // Estilos do Jogo
  titleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  button: { padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gameArea: { flex: 1 },
  bird: {
    position: 'absolute',
    left: BIRD_X_POSITION,
    width: BIRD_WIDTH,
    height: BIRD_HEIGHT,
  },
  score: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    fontSize: 40, // Aumentei um pouco para destaque
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    zIndex: 100
  },
  gameOverContainer: {
    position: 'absolute',
    top: height / 2 - 100,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 30,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    zIndex: 100,
    elevation: 10
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20
  },
});