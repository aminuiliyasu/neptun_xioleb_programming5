const axios = require('axios');
const WebSocket = require('ws');
const readline = require('readline');
const chalk = require('chalk');

// Service URLs
const USER_SERVICE_URL = 'http://localhost:3001';
const ROOM_SERVICE_URL = 'http://localhost:3002';
const GAME_SERVICE_URL = 'http://localhost:3003';
const WS_URL = 'ws://localhost:3004';

class CLIGameClient {
  constructor() {
    this.userId = null;
    this.sessionId = null;
    this.username = null;
    this.currentRoom = null;
    this.currentGame = null;
    this.ws = null;
    this.rl = null;
    this.waitingForInput = false;
    this.currentQuestion = null;
    this.pendingResolve = null;
    this.inputBuffer = '';
    this.promptActive = false;
  }

  async start() {
    console.log(chalk.blue.bold('Distributed Game System - CLI Client'));
    console.log(chalk.gray('Rock Paper Scissors Game\n'));

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Set up event-driven input handling
    this.rl.on('line', (line) => {
      if (this.pendingResolve && this.promptActive) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        this.promptActive = false;
        resolve(line);
      }
    });

    this.rl.on('close', () => {
      process.exit(0);
    });

    await this.showMainMenu();
  }

  async showMainMenu() {
    console.log(chalk.yellow('\nMain Menu:'));
    console.log('1. Register');
    console.log('2. Login');
    console.log('3. Exit');

    const choice = await this.askQuestion('\nEnter your choice (1-3): ');
    
    switch (choice.trim()) {
      case '1':
        await this.register();
        break;
      case '2':
        await this.login();
        break;
      case '3':
        console.log(chalk.green('Goodbye!'));
        process.exit(0);
        break;
      default:
        console.log(chalk.red('ERROR: Invalid choice. Please try again.'));
        await this.showMainMenu();
    }
  }

  async register() {
    console.log(chalk.blue('\nREGISTRATION: User Registration'));
    
    const username = await this.askQuestion('Enter username: ');
    const password = await this.askQuestion('Enter password: ');

    try {
      const response = await axios.post(`${USER_SERVICE_URL}/api/users/register`, {
        username,
        password
      });

      if (response.data.success) {
        console.log(chalk.green('SUCCESS: Registration successful!'));
        await this.login();
      } else {
        console.log(chalk.red(`ERROR: Registration failed: ${response.data.error}`));
        await this.showMainMenu();
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Registration error: ${error.message}`));
      await this.showMainMenu();
    }
  }

  async login() {
    console.log(chalk.blue('\nLOGIN: User Login'));
    
    const username = await this.askQuestion('Enter username: ');
    const password = await this.askQuestion('Enter password: ');

    try {
      const response = await axios.post(`${USER_SERVICE_URL}/api/users/login`, {
        username,
        password
      });

      if (response.data.success) {
        this.userId = response.data.user.id;
        this.sessionId = response.data.sessionId;
        this.username = response.data.user.username;
        
        console.log(chalk.green(`SUCCESS: Login successful! Welcome ${this.username}`));
        await this.showGameMenu();
      } else {
        console.log(chalk.red(`ERROR: Login failed: ${response.data.error}`));
        await this.showMainMenu();
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Login error: ${error.message}`));
      await this.showMainMenu();
    }
  }

  async showGameMenu() {
    // Don't show menu if game is active
    if (this.currentGame) {
      return;
    }

    // Cancel any pending question first
    this.cancelPendingQuestion();
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(chalk.yellow('\nMOVE: Game Menu:'));
    console.log('1. Create Room');
    console.log('2. Join Room');
    console.log('3. List Rooms');
    console.log('4. Leave Room');
    console.log('5. Logout');

    const choice = await this.askQuestion('\nEnter your choice (1-5): ');
    
    // Check again if game started while waiting for input
    if (this.currentGame || !choice || choice.trim() === '') {
      return;
    }
    
    switch (choice.trim()) {
      case '1':
        await this.createRoom();
        break;
      case '2':
        await this.joinRoom();
        break;
      case '3':
        await this.listRooms();
        break;
      case '4':
        await this.leaveRoom();
        break;
      case '5':
        await this.logout();
        break;
      default:
        console.log(chalk.red('ERROR: Invalid choice. Please try again.'));
        await this.showGameMenu();
    }
  }

  async createRoom() {
    console.log(chalk.blue('\nROOM: Create Room'));
    
    const roomName = await this.askQuestion('Enter room name (optional): ');

    try {
      const response = await axios.post(`${ROOM_SERVICE_URL}/api/rooms`, {
        hostUserId: this.userId,
        roomName: roomName || undefined
      });

      if (response.data.success) {
        this.currentRoom = response.data.room;
        console.log(chalk.green(`SUCCESS: Room created: ${this.currentRoom.name} (ID: ${this.currentRoom.id})`));
        console.log(chalk.yellow('WAITING: Waiting for another player to join...'));
        
        // Connect to WebSocket for real-time updates
        await this.connectWebSocket();
        
        // Don't show menu if game started immediately
        if (!this.currentGame) {
          await this.showGameMenu();
        }
      } else {
        console.log(chalk.red(`ERROR: Room creation failed: ${response.data.error}`));
        await this.showGameMenu();
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Room creation error: ${error.message}`));
      await this.showGameMenu();
    }
  }

  async joinRoom() {
    console.log(chalk.blue('\nJOIN: Join Room'));
    
    const roomId = await this.askQuestion('Enter room ID: ');

    try {
      const response = await axios.post(`${ROOM_SERVICE_URL}/api/rooms/${roomId}/join`, {
        userId: this.userId
      });

      if (response.data.success) {
        this.currentRoom = response.data.room;
        console.log(chalk.green(`SUCCESS: Joined room: ${this.currentRoom.name}`));
        
        // Connect to WebSocket for real-time updates
        await this.connectWebSocket();
        
        // Don't show menu if game started immediately
        if (!this.currentGame) {
          await this.showGameMenu();
        }
      } else {
        console.log(chalk.red(`ERROR: Join room failed: ${response.data.error}`));
        await this.showGameMenu();
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Join room error: ${error.message}`));
      await this.showGameMenu();
    }
  }

  async listRooms() {
    console.log(chalk.blue('\nLIST: Available Rooms'));

    try {
      const response = await axios.get(`${ROOM_SERVICE_URL}/api/rooms`);

      if (response.data.success) {
        const rooms = response.data.rooms;
        
        if (rooms.length === 0) {
          console.log(chalk.yellow('EMPTY: No rooms available'));
        } else {
          console.log(chalk.cyan('\nROOM: Available Rooms:'));
          rooms.forEach((room, index) => {
            console.log(`${index + 1}. ${room.name} (${room.playerCount}/${room.maxPlayers}) - ${room.status}`);
            console.log(`   ID: ${room.id}`);
          });
        }
        
        await this.showGameMenu();
      } else {
        console.log(chalk.red(`ERROR: Failed to list rooms: ${response.data.error}`));
        await this.showGameMenu();
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: List rooms error: ${error.message}`));
      await this.showGameMenu();
    }
  }

  async leaveRoom() {
    if (!this.currentRoom) {
      console.log(chalk.yellow('WARNING: You are not in any room'));
      await this.showGameMenu();
      return;
    }

    try {
      const response = await axios.post(`${ROOM_SERVICE_URL}/api/rooms/${this.currentRoom.id}/leave`, {
        userId: this.userId
      });

      if (response.data.success) {
        console.log(chalk.green('SUCCESS: Left room successfully'));
        this.currentRoom = null;
        this.currentGame = null;
        
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        
        await this.showGameMenu();
      } else {
        console.log(chalk.red(`ERROR: Leave room failed: ${response.data.error}`));
        await this.showGameMenu();
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Leave room error: ${error.message}`));
      await this.showGameMenu();
    }
  }

  async logout() {
    try {
      if (this.sessionId) {
        await axios.post(`${USER_SERVICE_URL}/api/users/logout`, {
          sessionId: this.sessionId
        });
      }
      
      if (this.ws) {
        this.ws.close();
      }
      
      this.userId = null;
      this.sessionId = null;
      this.username = null;
      this.currentRoom = null;
      this.currentGame = null;
      
      console.log(chalk.green('SUCCESS: Logged out successfully'));
      await this.showMainMenu();
    } catch (error) {
      console.log(chalk.red(`ERROR: Logout error: ${error.message}`));
      await this.showMainMenu();
    }
  }

  async connectWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_URL}?userId=${this.userId}`);

      this.ws.on('open', () => {
        console.log(chalk.green('CONNECTION: Connected to game server'));
        
        // Check if we're already in a room with an active game
        // Use setTimeout to ensure connection is fully established
        if (this.currentRoom) {
          setTimeout(() => {
            this.checkForActiveGame();
          }, 500);
        }
        
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(chalk.gray(`[WS] Received: ${message.type}`));
          // Handle message immediately - the event-driven input won't block
          this.handleWebSocketMessage(message).catch(err => {
            console.log(chalk.red(`ERROR: Handling WebSocket message: ${err.message}`));
            console.error(err);
          });
        } catch (error) {
          console.log(chalk.red(`ERROR: WebSocket message error: ${error.message}`));
        }
      });

      this.ws.on('close', () => {
        console.log(chalk.yellow('CONNECTION: Disconnected from game server'));
      });

      this.ws.on('error', (error) => {
        console.log(chalk.red(`ERROR: WebSocket error: ${error.message}`));
        reject(error);
      });
    });
  }

  async checkForActiveGame() {
    // Check if there's an active game for this user
    try {
      const response = await axios.get(`${GAME_SERVICE_URL}/api/game/player/${this.userId}`);
      if (response.data.success && response.data.game) {
        const game = response.data.game;
        if (game.status === 'active') {
          // Restore game state
          this.currentGame = {
            gameId: game.id,
            players: game.players,
            currentPlayer: game.currentPlayer,
            round: game.currentRound,
            maxRounds: game.maxRounds
          };
          
          console.log(chalk.green('\n=== GAME IN PROGRESS ==='));
          console.log(chalk.cyan(`Round ${game.currentRound}/${game.maxRounds}`));
          console.log(chalk.cyan(`Current Player: ${game.currentPlayer === this.userId ? 'You' : 'Opponent'}`));
          console.log('');
          
          if (game.currentPlayer === this.userId) {
            await this.makeMove();
          } else {
            console.log(chalk.yellow('WAITING: Waiting for opponent to make a move...'));
          }
        }
      }
    } catch (error) {
      // No active game, that's fine
    }
  }

  async handleWebSocketMessage(message) {
    // Cancel any pending game menu input
    if (message.type === 'game_started' || message.type === 'move_made' || message.type === 'round_ended' || message.type === 'game_ended') {
      this.cancelPendingQuestion();
    }

    // Ensure we have game data
    if (message.data && message.data.gameId && !this.currentGame) {
      this.currentGame = { gameId: message.data.gameId };
    }
    if (this.currentGame && message.data) {
      if (message.data.gameId) this.currentGame.gameId = message.data.gameId;
      if (message.data.players) this.currentGame.players = message.data.players;
      if (message.data.currentPlayer !== undefined) this.currentGame.currentPlayer = message.data.currentPlayer;
      if (message.data.round) this.currentGame.round = message.data.round;
      if (message.data.maxRounds) this.currentGame.maxRounds = message.data.maxRounds;
    }

    switch (message.type) {
      case 'game_started':
        this.cancelPendingQuestion();
        this.currentGame = message.data;
        // Small delay to ensure output is clear
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log(chalk.green.bold('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold('              GAME STARTED!'));
        console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log('');
        console.log(chalk.cyan(`Round: ${message.data.round}/${message.data.maxRounds}`));
        console.log(chalk.cyan(`Best of ${message.data.maxRounds} rounds`));
        console.log('');
        
        if (message.data.currentPlayer === this.userId) {
          console.log(chalk.green.bold('You go first!'));
          console.log('');
          await new Promise(resolve => setTimeout(resolve, 300));
          await this.makeMove();
        } else {
          console.log(chalk.yellow('Waiting for opponent to make the first move...'));
          console.log('');
        }
        break;

      case 'move_made':
        // CRITICAL: Cancel pending question FIRST - this now works with event-driven input
        this.cancelPendingQuestion();
        
        // Small delay to ensure output is clear
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update game state immediately
        if (this.currentGame && message.data.gameId) {
          this.currentGame.gameId = message.data.gameId;
          this.currentGame.currentPlayer = message.data.currentPlayer;
        }
        
        // If it's YOUR turn, immediately prompt for move
        if (message.data.currentPlayer === this.userId) {
          console.log(chalk.green.bold('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
          console.log(chalk.green.bold('           YOUR TURN NOW!'));
          console.log(chalk.green.bold('           Opponent made their move'));
          console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
          console.log('');
          // Immediately call makeMove - this will work now!
          await this.makeMove();
        } else {
          // It's opponent's turn, just wait
          console.log(chalk.yellow('\nOpponent is making their move...'));
          console.log(chalk.yellow('Waiting for your turn...\n'));
        }
        break;

      case 'round_ended':
        this.cancelPendingQuestion();
        console.log(chalk.green.bold('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold(`        ROUND ${message.data.round} RESULTS`));
        console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log('');
        
        const roundResult = message.data.result;
        if (roundResult && roundResult.moves) {
          const moves = roundResult.moves;
          const playerIds = Object.keys(moves);
          if (playerIds.length >= 2) {
            const p1Id = playerIds[0];
            const p2Id = playerIds[1];
            const p1IsMe = p1Id === this.userId;
            const p2IsMe = p2Id === this.userId;
            const p1Move = moves[p1Id]?.toUpperCase() || 'N/A';
            const p2Move = moves[p2Id]?.toUpperCase() || 'N/A';
            
            console.log(chalk.cyan(`  ${p1IsMe ? 'You' : 'Opponent'}: ${p1Move}`));
            console.log(chalk.cyan(`  ${p2IsMe ? 'You' : 'Opponent'}: ${p2Move}`));
            console.log('');
          }
        }
        
        if (roundResult && roundResult.result) {
          const result = roundResult.result;
          if (result.winner === 'player1') {
            const winnerId = this.currentGame?.players?.[0];
            if (winnerId === this.userId) {
              console.log(chalk.green.bold('  YOU WON THIS ROUND!'));
            } else {
              console.log(chalk.red.bold('  Opponent won this round'));
            }
          } else if (result.winner === 'player2') {
            const winnerId = this.currentGame?.players?.[1];
            if (winnerId === this.userId) {
              console.log(chalk.green.bold('  YOU WON THIS ROUND!'));
            } else {
              console.log(chalk.red.bold('  Opponent won this round'));
            }
          } else {
            console.log(chalk.yellow.bold('  DRAW - Same move!'));
          }
        }
        
        // Update game state
        if (this.currentGame) {
          this.currentGame.round = message.data.nextRound;
          this.currentGame.currentPlayer = message.data.currentPlayer;
          if (message.data.gameId) {
            this.currentGame.gameId = message.data.gameId;
          }
        }
        
        // Check if game continues
        if (message.data.nextRound <= (this.currentGame?.maxRounds || 3)) {
          console.log('');
          console.log(chalk.cyan(`Next Round: ${message.data.nextRound}/${this.currentGame?.maxRounds || 3}`));
          console.log('');
          
          if (message.data.currentPlayer === this.userId) {
            console.log(chalk.green('It\'s your turn to start the next round!\n'));
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.makeMove();
          } else {
            console.log(chalk.yellow('Waiting for opponent to start the next round...\n'));
          }
        }
        break;

      case 'game_ended':
        this.cancelPendingQuestion();
        console.log(chalk.green.bold('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold('              GAME ENDED!'));
        console.log(chalk.green.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log('');
        
        if (message.data.winner === this.userId) {
          console.log(chalk.green.bold('  YOU WON THE GAME!'));
        } else if (message.data.winner) {
          console.log(chalk.red.bold('  Opponent won the game'));
        } else {
          console.log(chalk.yellow.bold('  The game ended in a DRAW!'));
        }
        
        if (message.data.finalScore) {
          console.log('');
          console.log(chalk.cyan(`Final Score:`));
          const p1Score = message.data.finalScore.player1 || 0;
          const p2Score = message.data.finalScore.player2 || 0;
          const p1IsMe = this.currentGame?.players?.[0] === this.userId;
          console.log(chalk.cyan(`  ${p1IsMe ? 'You' : 'Opponent'}: ${p1Score} rounds won`));
          console.log(chalk.cyan(`  ${p1IsMe ? 'Opponent' : 'You'}: ${p2Score} rounds won`));
        }
        console.log('');
        
        this.currentGame = null;
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.showGameMenu();
        break;

      case 'player_joined':
        console.log(chalk.green(`PLAYER: Player joined the room`));
        break;

      case 'player_left':
        console.log(chalk.yellow(`PLAYER: Player left the room`));
        break;

      case 'error':
        console.log(chalk.red(`ERROR: Game error: ${message.data.message}`));
        break;
    }
  }

  async makeMove() {
    if (!this.currentGame) {
      console.log(chalk.red('ERROR: No active game'));
      return;
    }

    // Cancel any pending questions FIRST
    this.cancelPendingQuestion();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear any previous output and show move menu clearly
    console.log('');
    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.blue.bold('           YOUR TURN - MAKE A MOVE'));
    console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log(chalk.white('  1. Rock'));
    console.log(chalk.white('  2. Paper'));
    console.log(chalk.white('  3. Scissors'));
    console.log('');

    const choice = await this.askQuestion(chalk.yellow('Enter your choice (1-3): '));
    
    let move;
    switch (choice.trim()) {
      case '1':
        move = 'rock';
        break;
      case '2':
        move = 'paper';
        break;
      case '3':
        move = 'scissors';
        break;
      default:
        console.log(chalk.red('ERROR: Invalid choice. Please try again.'));
        await this.makeMove();
        return;
    }

    try {
      const response = await axios.post(`${GAME_SERVICE_URL}/api/game/move`, {
        userId: this.userId,
        gameId: this.currentGame.gameId,
        move
      });

      if (response.data.success) {
        console.log(chalk.green(`\nYour move (${move.toUpperCase()}) has been submitted!`));
        // Update game state if provided
        if (response.data.game) {
          this.currentGame = {
            gameId: response.data.game.id,
            players: response.data.game.players,
            currentPlayer: response.data.game.currentPlayer,
            round: response.data.game.currentRound,
            maxRounds: response.data.game.maxRounds
          };
        }
        console.log(chalk.gray('Waiting for opponent to make their move...\n'));
        // The WebSocket will notify us when opponent moves or round ends
        // Don't return - just wait for WebSocket message
      } else {
        console.log(chalk.red(`ERROR: Move failed: ${response.data.error}`));
        // Retry if it's a turn issue
        if (response.data.error.includes('turn')) {
          console.log(chalk.yellow('Waiting for your turn...'));
        } else {
          // If move failed, try again
          await this.makeMove();
        }
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Move error: ${error.response?.data?.error || error.message}`));
    }
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      // Cancel any pending question first
      if (this.pendingResolve) {
        const oldResolve = this.pendingResolve;
        this.pendingResolve = null;
        this.promptActive = false;
        process.stdout.write('\n');
        setImmediate(() => oldResolve(''));
      }
      
      // Set up new question using event-driven approach
      this.pendingResolve = resolve;
      this.promptActive = true;
      process.stdout.write(question);
    });
  }

  cancelPendingQuestion() {
    if (this.pendingResolve && this.promptActive) {
      process.stdout.write('\n');
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      this.promptActive = false;
      setImmediate(() => resolve(''));
    }
  }
}

// Start the CLI client
const client = new CLIGameClient();
client.start().catch(console.error);
