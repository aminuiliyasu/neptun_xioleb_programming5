git // Shared types and schemas for the distributed game system

const GameStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active', 
  FINISHED: 'finished',
  CANCELLED: 'cancelled'
};

const PlayerStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IN_GAME: 'in_game'
};

const MoveType = {
  ROCK: 'rock',
  PAPER: 'paper', 
  SCISSORS: 'scissors'
};

const WebSocketMessageTypes = {
  // Client to Server
  LOGIN: 'login',
  REGISTER: 'register',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  MAKE_MOVE: 'make_move',
  START_GAME: 'start_game',
  
  // Server to Client
  LOGIN_SUCCESS: 'login_success',
  LOGIN_ERROR: 'login_error',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  GAME_UPDATE: 'game_update',
  GAME_ENDED: 'game_ended',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  ERROR: 'error'
};

const GameResult = {
  WIN: 'win',
  LOSE: 'lose',
  DRAW: 'draw'
};

module.exports = {
  GameStatus,
  PlayerStatus,
  MoveType,
  WebSocketMessageTypes,
  GameResult
};
