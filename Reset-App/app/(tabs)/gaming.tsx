import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

// --- Constants ---
const BIRD_SIZE = 25;
const BIRD_X_POSITION = width * 0.22; // Bird's horizontal position
const OBSTACLE_WIDTH = 45;
const OBSTACLE_GAP = 1650;
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

export default function FlappyScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

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
      if (birdY.current + BIRD_SIZE >= height || birdY.current <= 0) {
        isGameOver = true;
      }

      // --- 2. Obstacle Logic ---
      let newObstacles = [];
      let newScore = score.current;

      for (const obs of obstacles.current) {
        const newX = obs.x - OBSTACLE_SPEED;

        // --- 2a. Collision Detection ---
        const birdLeft = BIRD_X_POSITION;
        const birdRight = BIRD_X_POSITION + BIRD_SIZE;
        const obstacleLeft = newX;
        const obstacleRight = newX + OBSTACLE_WIDTH;

        const isCollidingX = birdRight > obstacleLeft && birdLeft < obstacleRight;

        const birdTop = birdY.current;
        const birdBottom = birdY.current + BIRD_SIZE;
        const topObstacleBottom = obs.height;
        const bottomObstacleTop = obs.height + OBSTACLE_GAP;

        const isCollidingY = birdTop < topObstacleBottom || birdBottom > bottomObstacleTop;

        if (isCollidingX && isCollidingY) {
          isGameOver = true;
        }

        // --- 2b. Scoring Logic ---
        // Score when the pipe's back edge passes the bird's center
        const obstacleBackEdge = newX + OBSTACLE_WIDTH;
        const birdCenterX = BIRD_X_POSITION + BIRD_SIZE / 2;
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
  };

  // --- RENDER (JSX) ---
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
          <View
            style={[styles.bird, { top: gameState.birdY, backgroundColor: themeColors.tint }]}
          />

          {/* Obstacles */}
          {gameState.obstacles.map(obs => (
            <React.Fragment key={obs.id}>
              {/* Top Pipe */}
              <View
                style={[styles.obstacle, { height: obs.height, left: obs.x, backgroundColor: themeColors.text }]}
              />
              {/* Bottom Pipe */}
              <View
                style={[styles.obstacle, { height: height - obs.height - OBSTACLE_GAP, top: obs.height + OBSTACLE_GAP, left: obs.x, backgroundColor: themeColors.text }]}
              />
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
    width: BIRD_SIZE, 
    height: BIRD_SIZE, 
    borderRadius: BIRD_SIZE / 2 
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