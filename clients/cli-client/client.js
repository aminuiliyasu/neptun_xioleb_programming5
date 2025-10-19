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
  }

  async start() {
    console.log(chalk.blue.bold('Distributed Game System - CLI Client'));
    console.log(chalk.gray('Rock Paper Scissors Game\n'));

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
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
    console.log(chalk.yellow('\nMOVE: Game Menu:'));
    console.log('1. Create Room');
    console.log('2. Join Room');
    console.log('3. List Rooms');
    console.log('4. Leave Room');
    console.log('5. Logout');

    const choice = await this.askQuestion('\nEnter your choice (1-5): ');
    
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
        await this.showGameMenu();
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
        await this.showGameMenu();
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

    this.ws = new WebSocket(`${WS_URL}?userId=${this.userId}`);

    this.ws.on('open', () => {
      console.log(chalk.green('CONNECTION: Connected to game server'));
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.log(chalk.red(`ERROR: WebSocket message error: ${error.message}`));
      }
    });

    this.ws.on('close', () => {
      console.log(chalk.yellow('CONNECTION: Disconnected from game server'));
    });

    this.ws.on('error', (error) => {
      console.log(chalk.red(`ERROR: WebSocket error: ${error.message}`));
    });
  }

  async handleWebSocketMessage(message) {
    switch (message.type) {
      case 'game_started':
        this.currentGame = message.data;
        console.log(chalk.green('\nGAME: Game Started!'));
        console.log(chalk.cyan(`Players: ${message.data.players.join(', ')}`));
        console.log(chalk.cyan(`Round ${message.data.round}/${message.data.maxRounds}`));
        console.log(chalk.cyan(`Current Player: ${message.data.currentPlayer === this.userId ? 'You' : 'Opponent'}`));
        
        if (message.data.currentPlayer === this.userId) {
          await this.makeMove();
        } else {
          console.log(chalk.yellow('WAITING: Waiting for opponent to make a move...'));
        }
        break;

      case 'move_made':
        console.log(chalk.blue(`REGISTRATION: ${message.data.player === this.userId ? 'You' : 'Opponent'} made a move`));
        if (message.data.currentPlayer === this.userId) {
          await this.makeMove();
        } else {
          console.log(chalk.yellow('WAITING: Waiting for opponent to make a move...'));
        }
        break;

      case 'round_ended':
        console.log(chalk.green('\nROUND: Round Ended!'));
        console.log(chalk.cyan(`Round ${message.data.round} Result:`));
        console.log(chalk.cyan(`Winner: ${message.data.result.winner || 'Draw'}`));
        console.log(chalk.cyan(`Next Round: ${message.data.nextRound}`));
        console.log(chalk.cyan(`Current Player: ${message.data.currentPlayer === this.userId ? 'You' : 'Opponent'}`));
        
        if (message.data.currentPlayer === this.userId) {
          await this.makeMove();
        } else {
          console.log(chalk.yellow('WAITING: Waiting for opponent to make a move...'));
        }
        break;

      case 'game_ended':
        console.log(chalk.green('\nGAME: Game Ended!'));
        console.log(chalk.cyan(`Winner: ${message.data.winner === this.userId ? 'You Won!' : message.data.winner ? 'Opponent Won!' : 'Draw!'}`));
        console.log(chalk.cyan(`Final Score: ${JSON.stringify(message.data.finalScore)}`));
        
        this.currentGame = null;
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

    console.log(chalk.blue('\nMOVE: Make Your Move'));
    console.log('1. Rock');
    console.log('2. Paper');
    console.log('3. Scissors');

    const choice = await this.askQuestion('\nEnter your choice (1-3): ');
    
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
        console.log(chalk.green(`SUCCESS: Move made: ${move}`));
      } else {
        console.log(chalk.red(`ERROR: Move failed: ${response.data.error}`));
      }
    } catch (error) {
      console.log(chalk.red(`ERROR: Move error: ${error.message}`));
    }
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Start the CLI client
const client = new CLIGameClient();
client.start().catch(console.error);
