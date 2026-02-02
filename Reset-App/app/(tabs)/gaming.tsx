import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image, Modal, ActivityIndicator} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { BASE_URL } from '@/constants/Config';
import { Asset } from 'expo-asset';

const PIPE_CAP_IMG = require('@/assets/images/pipe_cap.png');
const PIPE_BODY_IMG = require('@/assets/images/pipe_body.png');
const BIRD_IMG = require('../../assets/images/bird_teste2.png');
const { width, height } = Dimensions.get('window');
const BACKGROUND_IMG = require('../../assets/images/fundo_teste.png');
// --- Constants ---
// --- DADOS DO PÁSSARO (NOVO) ---
const birdSource = Image.resolveAssetSource(BIRD_IMG); // Lê a imagem original

// Ajusta esta escala conforme o tamanho do teu PNG.
// Se a imagem for enorme (ex: 1000px), tenta 0.05 ou 0.1
const BIRD_SCALE = 0.025; 

// Calcula as dimensões finais automaticamente
const BIRD_WIDTH = birdSource.width * BIRD_SCALE;
const BIRD_HEIGHT = birdSource.height * BIRD_SCALE;

// Posição X fixa (mantém-se)
const BIRD_X_POSITION = width * 0.22;
// --- DADOS DA IMAGEM ---
// 1. O código lê a largura e altura REAIS do ficheiro
const capSource = Image.resolveAssetSource(PIPE_CAP_IMG);

// --- ESCALA ---
// 1.0 = Tamanho original do ficheiro (pixel por pixel)
// 0.6 = 60% do tamanho original
// 3.0 = Triplo do tamanho (bom para Pixel Art pequena)
const PIPE_SCALE = 0.1; 

// --- CÁLCULOS DIRETOS ---
// A Hitbox é simplesmente o tamanho da imagem vezes a escala.
// Isto garante que a proporção (Aspect Ratio) é SEMPRE perfeita.
const OBSTACLE_WIDTH = capSource.width * PIPE_SCALE;
const CAP_HEIGHT = capSource.height * PIPE_SCALE;

// ... (Resto das constantes)
const OBSTACLE_GAP = 165;
const OBSTACLE_SPEED = 2.28; // Speed of pipes moving left
const OBSTACLE_SPACING = width * 0.73; // Distance between pipes

// --- Physics Constants ---
const GRAVITY = 0.25; // Acceleration (pixels per frame per frame)
const JUMP_VELOCITY = -5.9; // Initial upward velocity on tap


/**
 * Generates a random height for the top obstacle.
 */
const getRandomObstacleHeight = () => {
  return Math.random() * (height - OBSTACLE_GAP - 100) + 50;
};

/**
 * Helper to create a new obstacle object
 */
const createObstacle = (x: number, id: number) => ({
  id,
  x,
  height: getRandomObstacleHeight(),
  passed: false, // To track scoring
});

// Cria esta lista com TODAS as imagens que usas no jogo
const ASSETS_TO_LOAD = [
  require('../../assets/images/bird_teste2.png'), // <--- Usa o caminho igual ao que tens no <Image> lá em baixo
  require('@/assets/images/pipe_cap.png'),
  require('@/assets/images/pipe_body.png'),
  BACKGROUND_IMG,
];

export default function FlappyScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        // Carrega todas as imagens para a memória RAM
        await Promise.all(ASSETS_TO_LOAD.map(img => Asset.fromModule(img).downloadAsync()));
      } catch (e) {
        console.warn("Erro ao carregar assets:", e);
      } finally {
        setIsAssetsLoaded(true); // Liberta o jogo
      }
    };
    loadAssets();
  }, []);



  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // --- Game State ---
  const [gameState, setGameState] = useState({
    birdY: height / 2,
    obstacles: [createObstacle(width, 1)], // Start with one obstacle
    score: 0,
  });

  // --- Game Logic Refs (Top Level) ---
  const birdY = useRef(height / 2);
  const birdVelocity = useRef(0);
  const obstacles = useRef(gameState.obstacles);
  const score = useRef(0);
  const nextObstacleId = useRef(2);
  
  // The frameId ref MUST be at the top level, not in useEffect
  const frameId = useRef<number | null>(null);


  // --- The Game Loop ---
  useEffect(() => {
    // We no longer define frameId here
    
    if (!gameStarted || gameOver) {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
      return;
    }

    const gameLoop = () => {
      let isGameOver = false;

      // --- 1. Bird Physics Logic ---
      birdVelocity.current += GRAVITY;
      birdY.current += birdVelocity.current;

      // Collision with ground or ceiling
      if (birdY.current + BIRD_HEIGHT >= height || birdY.current <= 0) {
        isGameOver = true;
      }

      // --- 2. Obstacle Logic ---
      let newObstacles = [];
      let newScore = score.current;

      for (const obs of obstacles.current) {
        const newX = obs.x - OBSTACLE_SPEED;

        // --- 2a. Collision Detection ---
        const birdLeft = BIRD_X_POSITION;
        const birdRight = BIRD_X_POSITION + BIRD_WIDTH;
        const obstacleLeft = newX;
        const obstacleRight = newX + OBSTACLE_WIDTH;

        const isCollidingX = birdRight > obstacleLeft && birdLeft < obstacleRight;

        const birdTop = birdY.current;
        const birdBottom = birdY.current + BIRD_HEIGHT;
        const topObstacleBottom = obs.height;
        const bottomObstacleTop = obs.height + OBSTACLE_GAP;

        const isCollidingY = birdTop < topObstacleBottom || birdBottom > bottomObstacleTop;

        if (isCollidingX && isCollidingY) {
          isGameOver = true;
        }

        // --- 2b. Scoring Logic ---
        // Score when the pipe's back edge passes the bird's center
        const obstacleBackEdge = newX + OBSTACLE_WIDTH;
        const birdCenterX = BIRD_X_POSITION + BIRD_WIDTH / 2;
        if (obstacleBackEdge < birdCenterX && !obs.passed) {
          newScore++;
          obs.passed = true;
        }

        // Keep obstacle if it's still on screen
        if (newX > -OBSTACLE_WIDTH) {
          newObstacles.push({ ...obs, x: newX });
        }
      }

      // --- 2c. Add New Obstacle ---
      const lastObstacle = newObstacles[newObstacles.length - 1];
      if (lastObstacle && lastObstacle.x < width - OBSTACLE_SPACING) {
        newObstacles.push(createObstacle(width, nextObstacleId.current));
        nextObstacleId.current++;
      }

      // Update refs
      obstacles.current = newObstacles;
      score.current = newScore;
      
      // --- 3. Update Render State ---
      setGameState({
        birdY: birdY.current,
        obstacles: newObstacles,
        score: newScore,
      });

      // --- 4. Handle Loop ---
      if (isGameOver) {
        setGameOver(true);
      } else {
        frameId.current = requestAnimationFrame(gameLoop);
      }
    };

    // --- START THE LOOP ---
    frameId.current = requestAnimationFrame(gameLoop);

    // --- CLEANUP ---
    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
    
  }, [gameStarted, gameOver]);


  const handleJump = () => {
    if (!gameStarted) setGameStarted(true);
    if (gameOver) return;

    // --- Apply Jump Velocity ---
    birdVelocity.current = JUMP_VELOCITY;
  };

  const resetGame = () => {
    // --- Reset All Logic ---
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
      // Bloqueio: Enquanto não carregar, mostra rodinha
  };
  if (!isAssetsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }
  

  // --- RENDER (JSX) ---
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
          zIndex: -10 // Fica atrás de tudo
        }}
        resizeMode="cover"
      />


      {!gameStarted && !gameOver && (
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: themeColors.text }]}>Flappy Bird</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.tint }]} onPress={() => setGameStarted(true)}>
            <Text style={styles.buttonText}>Play</Text>
          </TouchableOpacity>
        </View>
      )}

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
              
              {/* --- CANO DE CIMA (Top Pipe) --- */}
              <View style={{
                  position: 'absolute',
                  left: obs.x,
                  width: OBSTACLE_WIDTH, 
                  height: obs.height,
                  overflow: 'hidden' 
                /*
                  // --- ADICIONA ISTO (DEBUG) ---
                  ,borderWidth: 1,
                  borderColor: '#00FF00',           // Verde Neon
                  backgroundColor: 'rgba(0, 255, 0, 0.5)' // Verde transparente
                  //REMOVER
                */
                }}>
                  {/* 1. O CORPO */}
                  <Image 
                    source={PIPE_BODY_IMG} 
                    style={{ 
                        width: '100%', 
                        flex: 1,
                        // Empurra o corpo para baixo (metade da tampa)
                        marginBottom: -(CAP_HEIGHT / 2), 
                        zIndex: 1, 
                    }} 
                    resizeMode="stretch" 
                  />
                  
                  {/* 2. A TAMPA */}
                  <Image 
                    source={PIPE_CAP_IMG} 
                    style={{ 
                        width: '100%', 
                        height: CAP_HEIGHT,
                        zIndex: 10, // O zIndex trata da ordem no iOS e Android
                        // Removi o 'elevation' para corrigir o erro vermelho
                    }} 
                    resizeMode="contain" 
                  />
              </View>

              {/* --- CANO DE BAIXO (Bottom Pipe) --- */}
              <View style={{
                  position: 'absolute',
                  left: obs.x,
                  top: obs.height + OBSTACLE_GAP,
                  width: OBSTACLE_WIDTH,
                  height: height - obs.height - OBSTACLE_GAP,
                  overflow: 'hidden'
                /*
                  // --- ADICIONA ISTO (DEBUG) ---
                  ,borderWidth: 1,
                  borderColor: '#00FF00',           // Verde Neon
                  backgroundColor: 'rgba(0, 255, 0, 0.5)' // Verde transparente
                  //REMOVER
                  */
                }}>
                  {/* 1. A TAMPA */}
                  <Image 
                    source={PIPE_CAP_IMG} 
                    style={{ 
                        width: '100%', 
                        height: CAP_HEIGHT,
                        zIndex: 10, 
                        // Removi o 'elevation' aqui também
                    }} 
                    resizeMode="contain" 
                  />

                  {/* 2. O CORPO */}
                  <Image 
                    source={PIPE_BODY_IMG} 
                    style={{ 
                        width: '100%', 
                        flex: 1,
                        // Puxa o corpo para cima (metade da tampa)
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
  titleContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  button: { padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gameArea: { flex: 1 },
  bird: { 
    position: 'absolute', 
    left: BIRD_X_POSITION, // CHANGED
    width: BIRD_WIDTH, 
    height: BIRD_HEIGHT,
    /*
    // --- ADICIONA ISTO PARA VER A HITBOX ---
    borderWidth: 1,
    borderColor: 'red',              // Borda vermelha
    backgroundColor: 'rgba(255, 0, 0, 0.5)', // Vermelho transparente (50%)
    zIndex: 100,                     // Garante que fica por cima de tudo
    //REMOVER
    */
  },
  obstacle: { 
    position: 'absolute', 
    width: OBSTACLE_WIDTH 
  },
  score: { 
    position: 'absolute', 
    top: 50, 
    alignSelf: 'center', 
    fontSize: 24, 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  gameOverContainer: { 
    position: 'absolute', 
    top: height / 2 - 100,
    left: width / 2 - 150,
    width: 300,
    alignSelf: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  gameOverText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
});