const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const WebSocket = require('ws');
const { GameStatus, MoveType, GameResult } = require('../../shared/types');

const app = express();
const PORT = process.env.PORT || 3003;
const WS_PORT = process.env.WS_PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const games = new Map(); // gameId -> game data
const playerGames = new Map(); // userId -> gameId
const connectedClients = new Map(); // userId -> WebSocket connection

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const ROOM_SERVICE_URL = process.env.ROOM_SERVICE_URL || 'http://localhost:3002';

// Game Rules Service - Game Logic
class GameService {
  constructor() {
    this.games = games;
    this.playerGames = playerGames;
    this.connectedClients = connectedClients;
  }

  // Start a new game
  async startGame(roomId, players) {
    const gameId = uuidv4();
    const game = {
      id: gameId,
      roomId,
      players,
      currentPlayer: players[0],
      moves: {},
      rounds: [],
      currentRound: 1,
      maxRounds: 3,
      status: GameStatus.ACTIVE,
      winner: null,
      createdAt: new Date()
    };

    this.games.set(gameId, game);
    
    // Track which game each player is in
    players.forEach(playerId => {
      this.playerGames.set(playerId, gameId);
    });

    // Notify all players that game has started
    this.broadcastToPlayers(players, {
      type: 'game_started',
      data: {
        gameId,
        players,
        currentPlayer: game.currentPlayer,
        round: game.currentRound,
        maxRounds: game.maxRounds
      }
    });

    return { success: true, game };
  }

  // Make a move
  async makeMove(userId, gameId, move) {
    const game = this.games.get(gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== GameStatus.ACTIVE) {
      return { success: false, error: 'Game is not active' };
    }

    if (game.currentPlayer !== userId) {
      return { success: false, error: 'Not your turn' };
    }

    if (!Object.values(MoveType).includes(move)) {
      return { success: false, error: 'Invalid move' };
    }

    // Record the move
    game.moves[userId] = move;

    // Check if both players have made their moves
    const playersWithMoves = Object.keys(game.moves).length;
    
    if (playersWithMoves === game.players.length) {
      // Both players have moved, determine round winner
      const roundResult = this.determineRoundWinner(game);
      game.rounds.push(roundResult);
      
      // Clear moves for next round
      game.moves = {};
      
      // Check if game is over
      if (game.currentRound >= game.maxRounds) {
        const gameWinner = this.determineGameWinner(game);
        game.winner = gameWinner;
        game.status = GameStatus.FINISHED;
        
        // Notify players of game end
        this.broadcastToPlayers(game.players, {
          type: 'game_ended',
          data: {
            gameId,
            winner: gameWinner,
            rounds: game.rounds,
            finalScore: this.calculateFinalScore(game)
          }
        });
      } else {
        // Move to next round
        game.currentRound++;
        game.currentPlayer = game.players[0]; // Reset to first player
        
        // Notify players of round result and next round
        this.broadcastToPlayers(game.players, {
          type: 'round_ended',
          data: {
            gameId,
            round: game.currentRound - 1,
            result: roundResult,
            nextRound: game.currentRound,
            currentPlayer: game.currentPlayer
          }
        });
      }
    } else {
      // Switch to next player
      const currentPlayerIndex = game.players.indexOf(userId);
      game.currentPlayer = game.players[(currentPlayerIndex + 1) % game.players.length];
      
      // Notify players of move made
      this.broadcastToPlayers(game.players, {
        type: 'move_made',
        data: {
          gameId,
          player: userId,
          move,
          currentPlayer: game.currentPlayer
        }
      });
    }

    return { success: true, game };
  }

  // Determine round winner
  determineRoundWinner(game) {
    const moves = game.moves;
    const players = game.players;
    const player1 = players[0];
    const player2 = players[1];
    
    const move1 = moves[player1];
    const move2 = moves[player2];
    
    const result = this.compareMoves(move1, move2);
    
    return {
      round: game.currentRound,
      moves: { [player1]: move1, [player2]: move2 },
      result: result,
      winner: result.winner
    };
  }

  // Compare two moves and determine winner
  compareMoves(move1, move2) {
    if (move1 === move2) {
      return { winner: null, result: GameResult.DRAW };
    }
    
    const winConditions = {
      [MoveType.ROCK]: MoveType.SCISSORS,
      [MoveType.PAPER]: MoveType.ROCK,
      [MoveType.SCISSORS]: MoveType.PAPER
    };
    
    if (winConditions[move1] === move2) {
      return { winner: 'player1', result: GameResult.WIN };
    } else {
      return { winner: 'player2', result: GameResult.LOSE };
    }
  }

  // Determine game winner
  determineGameWinner(game) {
    const scores = this.calculateFinalScore(game);
    
    if (scores.player1 > scores.player2) {
      return game.players[0];
    } else if (scores.player2 > scores.player1) {
      return game.players[1];
    } else {
      return null; // Draw
    }
  }

  // Calculate final score
  calculateFinalScore(game) {
    const scores = { player1: 0, player2: 0 };
    
    game.rounds.forEach(round => {
      if (round.result.winner === 'player1') {
        scores.player1++;
      } else if (round.result.winner === 'player2') {
        scores.player2++;
      }
    });
    
    return scores;
  }

  // Get game status
  getGameStatus(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    return { success: true, game };
  }

  // Get player's current game
  getPlayerGame(userId) {
    const gameId = this.playerGames.get(userId);
    if (!gameId) {
      return { success: false, error: 'Player not in any game' };
    }
    return this.getGameStatus(gameId);
  }

  // Broadcast message to multiple players
  broadcastToPlayers(playerIds, message) {
    playerIds.forEach(playerId => {
      const client = this.connectedClients.get(playerId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Handle WebSocket connection
  handleWebSocketConnection(ws, userId) {
    this.connectedClients.set(userId, ws);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        await this.handleWebSocketMessage(ws, userId, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });

    ws.on('close', () => {
      this.connectedClients.delete(userId);
    });
  }

  // Handle WebSocket messages
  async handleWebSocketMessage(ws, userId, message) {
    switch (message.type) {
      case 'make_move':
        const { gameId, move } = message.data;
        const result = await this.makeMove(userId, gameId, move);
        ws.send(JSON.stringify({
          type: 'move_result',
          data: result
        }));
        break;
        
      case 'get_game_status':
        const { gameId: statusGameId } = message.data;
        const statusResult = this.getGameStatus(statusGameId);
        ws.send(JSON.stringify({
          type: 'game_status',
          data: statusResult
        }));
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Unknown message type' }
        }));
    }
  }
}

const gameService = new GameService();

// API Routes

// Start game
app.post('/api/game/start', async (req, res) => {
  const { roomId, players } = req.body;
  
  if (!roomId || !players || !Array.isArray(players)) {
    return res.status(400).json({ success: false, error: 'Room ID and players required' });
  }

  const result = await gameService.startGame(roomId, players);
  res.status(201).json(result);
});

// Make a move
app.post('/api/game/move', async (req, res) => {
  const { userId, gameId, move } = req.body;
  
  if (!userId || !gameId || !move) {
    return res.status(400).json({ success: false, error: 'User ID, game ID, and move required' });
  }

  const result = await gameService.makeMove(userId, gameId, move);
  res.json(result);
});

// Get game status
app.get('/api/game/:gameId/status', (req, res) => {
  const { gameId } = req.params;
  const result = gameService.getGameStatus(gameId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// Get player's game
app.get('/api/game/player/:userId', (req, res) => {
  const { userId } = req.params;
  const result = gameService.getPlayerGame(userId);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'Game Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeGames: gameService.games.size,
    connectedClients: gameService.connectedClients.size
  });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`Game Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Start WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    ws.close(1008, 'User ID required');
    return;
  }

  console.log(`WebSocket connection established for user ${userId}`);
  gameService.handleWebSocketConnection(ws, userId);
});

console.log(`WebSocket server running on port ${WS_PORT}`);

module.exports = { GameService, gameService };
