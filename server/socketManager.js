const Player = require('./models/player');
const GameRoom = require('./models/gameRoom');
const AIPromptGenerator = require('./services/aiPromptGenerator');
const ImageUploader = require('./services/imageUploader');

/**
 * Socket.IO Manager for The Kitchen Game
 * Handles real-time communication between players
 */
class SocketManager {
  constructor(io) {
    this.io = io;
    this.aiPromptGenerator = new AIPromptGenerator();
    this.imageUploader = new ImageUploader();
    this.setupEventHandlers();
    this.startPeriodicCleanup();
  }

  /**
   * Set up all Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
      
      // Handle user disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });

      // Room management events
      socket.on('createRoom', (data) => {
        this.handleCreateRoom(socket, data);
      });

      socket.on('joinRoom', (data) => {
        this.handleJoinRoom(socket, data);
      });

      socket.on('leaveRoom', (data) => {
        this.handleLeaveRoom(socket, data);
      });

      // Game management events
      socket.on('startGame', (data) => {
        this.handleStartGame(socket, data);
      });

      socket.on('continueGame', (data) => {
        this.handleContinueGame(socket, data);
      });

      socket.on('nextToGame', (data) => {
        this.handleNextToGame(socket, data);
      });


      // Voting events
      socket.on('startVoting', (data) => {
        this.handleStartVoting(socket, data);
      });

      socket.on('castVote', (data) => {
        this.handleCastVote(socket, data);
      });

      // Log successful connection
      socket.emit('connected', {
        message: 'Successfully connected to The Kitchen server',
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Handle user disconnection
   * @param {Object} socket - The disconnected socket
   */
  async handleDisconnect(socket) {
    try {
      console.log(`User disconnected: ${socket.id}`);
      
      // Find and remove player from any room they were in
      const player = await Player.findOne({ socketId: socket.id });
      
      if (player) {
        console.log(`Removing player ${player.name} (${socket.id}) from rooms`);
        
        // Find rooms containing this player
        const rooms = await GameRoom.find({ 
          players: player._id 
        }).populate('players');
        
        for (const room of rooms) {
          try {
            // Check if the disconnecting player is the host
            const wasHost = player.isHost;
            
            // Remove player from room with error handling
            await room.removePlayer(player._id);
            
            // Get updated room to check if it's empty
            const updatedRoom = await GameRoom.findById(room._id).populate('players');
            
            if (updatedRoom && updatedRoom.players.length === 0) {
              console.log(`Room ${room.roomCode} is now empty - keeping it alive for potential rejoin`);
              // Don't delete empty rooms immediately - keep them for potential rejoin
              // Rooms will be cleaned up by the periodic cleanup task
            } else if (updatedRoom) {
              // If the disconnecting player was the host, assign host status to another player
              if (wasHost && updatedRoom.players.length > 0) {
                const newHost = updatedRoom.players[0]; // Assign to first remaining player
                await Player.findByIdAndUpdate(newHost._id, { isHost: true });
                console.log(`Host status transferred from ${player.name} to ${newHost.name} in room ${room.roomCode}`);
              }
              
              // Notify remaining players about the disconnection
              this.io.to(room.roomCode).emit('playerLeft', {
                playerId: player._id,
                playerName: player.name,
                message: `${player.name} has left the room`,
                remainingPlayers: updatedRoom.players.length,
                wasHost: wasHost
              });
            }
          } catch (error) {
            console.error(`Error removing player from room ${room.roomCode}:`, error.message);
            // Continue with other rooms even if one fails
          }
        }
        
        // Delete the player record
        await Player.findByIdAndDelete(player._id);
        console.log(`Player ${player.name} removed from database`);
      } else {
        // No player found with this socket ID - this might be a duplicate disconnect
        console.log(`No player found for socket ${socket.id} - might be duplicate disconnect`);
      }
      
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Get socket instance for external use
   * @returns {Object} Socket.IO instance
   */
  getIO() {
    return this.io;
  }

  /**
   * Emit event to a specific room
   * @param {string} roomCode - The room code
   * @param {string} event - The event name
   * @param {Object} data - The data to send
   */
  emitToRoom(roomCode, event, data) {
    this.io.to(roomCode).emit(event, data);
  }

  /**
   * Emit event to a specific socket
   * @param {string} socketId - The socket ID
   * @param {string} event - The event name
   * @param {Object} data - The data to send
   */
  emitToSocket(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }

  /**
   * Join a socket to a room
   * @param {string} socketId - The socket ID
   * @param {string} roomCode - The room code
   */
  joinRoom(socketId, roomCode) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomCode);
      console.log(`Socket ${socketId} joined room ${roomCode}`);
    }
  }

  /**
   * Leave a socket from a room
   * @param {string} socketId - The socket ID
   * @param {string} roomCode - The room code
   */
  leaveRoom(socketId, roomCode) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomCode);
      console.log(`Socket ${socketId} left room ${roomCode}`);
    }
  }

  /**
   * Get connected sockets count
   * @returns {number} Number of connected sockets
   */
  getConnectedCount() {
    return this.io.sockets.sockets.size;
  }


  /**
   * Get all connected socket IDs
   * @returns {Array} Array of socket IDs
   */
  getConnectedSockets() {
    return Array.from(this.io.sockets.sockets.keys());
  }

  /**
   * Handle room creation
   * @param {Object} socket - The socket requesting room creation
   * @param {Object} data - Data containing player name
   */
  async handleCreateRoom(socket, data) {
    try {
      const { playerName } = data;

      // Validate input
      if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
        socket.emit('error', {
          message: 'Player name is required and must be a non-empty string',
          code: 'INVALID_PLAYER_NAME'
        });
        return;
      }

      if (playerName.trim().length > 50) {
        socket.emit('error', {
          message: 'Player name must be 50 characters or less',
          code: 'PLAYER_NAME_TOO_LONG'
        });
        return;
      }

      // Validate player name contains only allowed characters (letters, numbers, spaces, hyphens, underscores)
      const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
      if (!nameRegex.test(playerName.trim())) {
        socket.emit('error', {
          message: 'Player name can only contain letters, numbers, spaces, hyphens, and underscores',
          code: 'INVALID_PLAYER_NAME_CHARACTERS'
        });
        return;
      }

      // Check if player already exists with this socket ID
      const existingPlayer = await Player.findOne({ socketId: socket.id });
      if (existingPlayer) {
        socket.emit('error', {
          message: 'Player already exists for this connection',
          code: 'PLAYER_ALREADY_EXISTS'
        });
        return;
      }

      // Create player
      const player = new Player({
        socketId: socket.id,
        name: playerName.trim(),
        isHost: true
      });

      await player.save();

      // Generate unique room code
      let roomCode;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        roomCode = this.generateRoomCode();
        const existingRoom = await GameRoom.findOne({ roomCode });
        if (!existingRoom) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        await Player.findByIdAndDelete(player._id);
        socket.emit('error', {
          message: 'Failed to generate unique room code. Please try again.',
          code: 'ROOM_CODE_GENERATION_FAILED'
        });
        return;
      }

      // Create room
      const room = new GameRoom({
        roomCode,
        players: [player._id],
        originalHostName: playerName.trim(),
        gameState: 'lobby'
      });

      await room.save();

      // Join socket to room
      socket.join(roomCode);

      // Populate room data for response
      const populatedRoom = await GameRoom.findById(room._id).populate('players');

      // Emit success response
      socket.emit('roomCreated', {
        success: true,
        message: 'Room created successfully',
        data: {
          roomCode: populatedRoom.roomCode,
          gameState: populatedRoom.gameState,
          playerCount: populatedRoom.players.length,
          players: populatedRoom.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          })),
          createdAt: populatedRoom.createdAt
        }
      });

      console.log(`Room ${roomCode} created by ${playerName} (${socket.id})`);

    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', {
        message: 'Internal server error while creating room',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle room joining
   * @param {Object} socket - The socket requesting to join
   * @param {Object} data - Data containing room code and player name
   */
  async handleJoinRoom(socket, data) {
    try {
      const { roomCode, playerName } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
        socket.emit('error', {
          message: 'Player name is required and must be a non-empty string',
          code: 'INVALID_PLAYER_NAME'
        });
        return;
      }

      if (playerName.trim().length > 50) {
        socket.emit('error', {
          message: 'Player name must be 50 characters or less',
          code: 'PLAYER_NAME_TOO_LONG'
        });
        return;
      }

      // Validate player name contains only allowed characters (letters, numbers, spaces, hyphens, underscores)
      const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
      if (!nameRegex.test(playerName.trim())) {
        socket.emit('error', {
          message: 'Player name can only contain letters, numbers, spaces, hyphens, and underscores',
          code: 'INVALID_PLAYER_NAME_CHARACTERS'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Check if room exists
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found. Please check the room code.',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if room is full (assuming max 8 players)
      if (room.players.length >= 8) {
        socket.emit('error', {
          message: 'Room is full. Maximum 8 players allowed.',
          code: 'ROOM_FULL'
        });
        return;
      }

      // Check if player already exists with this socket ID
      const existingPlayer = await Player.findOne({ socketId: socket.id });
      if (existingPlayer) {
        socket.emit('error', {
          message: 'Player already exists for this connection',
          code: 'PLAYER_ALREADY_EXISTS'
        });
        return;
      }

      // Check if player name is already taken in this room
      const existingPlayerInRoom = room.players.find(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
      if (existingPlayerInRoom) {
        // If the player with the same name is already in the room, this might be a reconnection
        // Check if the existing player has a different socket ID (meaning they disconnected and are reconnecting)
        if (existingPlayerInRoom.socketId !== socket.id) {
          console.log(`Player ${playerName} is reconnecting with new socket ID ${socket.id} (old: ${existingPlayerInRoom.socketId})`);
          
          // Update the existing player's socket ID instead of creating a new player
          await Player.findByIdAndUpdate(existingPlayerInRoom._id, { socketId: socket.id });
          
          // Join socket to room
          socket.join(normalizedRoomCode);
          
          // Get updated room data
          const updatedRoom = await GameRoom.findById(room._id).populate('players');
          
          // Emit room update to all players in the room
          this.emitToRoom(normalizedRoomCode, 'roomUpdate', {
            success: true,
            message: `${playerName} reconnected to the room`,
            data: {
              roomCode: updatedRoom.roomCode,
              gameState: updatedRoom.gameState,
              playerCount: updatedRoom.players.length,
              players: updatedRoom.players.map(p => ({
                id: p._id,
                name: p.name,
                isHost: p.isHost,
                socketId: p.socketId
              })),
              createdAt: updatedRoom.createdAt
            }
          });

          // Emit success response to reconnecting player
          socket.emit('roomJoined', {
            success: true,
            message: 'Successfully reconnected to room',
            data: {
              roomCode: updatedRoom.roomCode,
              gameState: updatedRoom.gameState,
              playerCount: updatedRoom.players.length,
              players: updatedRoom.players.map(p => ({
                id: p._id,
                name: p.name,
                isHost: p.isHost,
                socketId: p.socketId
              })),
              createdAt: updatedRoom.createdAt
            }
          });

          console.log(`${playerName} (${socket.id}) reconnected to room ${normalizedRoomCode}`);
          return;
        } else {
          // Same socket ID, this shouldn't happen but handle it gracefully
          socket.emit('error', {
            message: 'Player name is already taken in this room',
            code: 'NAME_ALREADY_TAKEN'
          });
          return;
        }
      }

      // Create player
      const player = new Player({
        socketId: socket.id,
        name: playerName.trim(),
        isHost: false
      });

      await player.save();

      // Add player to room
      await room.addPlayer(player._id);

      // Join socket to room
      socket.join(normalizedRoomCode);

      // Get updated room data
      const updatedRoom = await GameRoom.findById(room._id).populate('players');
      
      // Check if the joining player is the original host
      const isOriginalHost = room.originalHostName && playerName.trim().toLowerCase() === room.originalHostName.toLowerCase();
      
      if (isOriginalHost) {
        // If the joining player is the original host, they should get host status back
        // First, remove host status from current host if any
        const currentHost = updatedRoom.players.find(p => p.isHost);
        if (currentHost) {
          await Player.findByIdAndUpdate(currentHost._id, { isHost: false });
          console.log(`Host status removed from ${currentHost.name} in room ${normalizedRoomCode}`);
        }
        
        // Assign host status to the original host
        await Player.findByIdAndUpdate(player._id, { isHost: true });
        console.log(`Host status restored to original host ${player.name} in room ${normalizedRoomCode}`);
        
        // Update the room data to reflect the new host status
        const refreshedRoom = await GameRoom.findById(room._id).populate('players');
        updatedRoom.players = refreshedRoom.players;
      } else {
        // Check if there's no host in the room and assign host status
        const hasHost = updatedRoom.players.some(p => p.isHost);
        if (!hasHost) {
          // If no host exists, assign host status to the joining player
          await Player.findByIdAndUpdate(player._id, { isHost: true });
          console.log(`Host status assigned to ${player.name} in room ${normalizedRoomCode} (no host existed)`);
          
          // Update the room data to reflect the new host status
          const refreshedRoom = await GameRoom.findById(room._id).populate('players');
          updatedRoom.players = refreshedRoom.players;
        }
      }

      // Emit room update to all players in the room
      this.emitToRoom(normalizedRoomCode, 'roomUpdate', {
        success: true,
        message: `${player.name} joined the room`,
        data: {
          roomCode: updatedRoom.roomCode,
          gameState: updatedRoom.gameState,
          playerCount: updatedRoom.players.length,
          players: updatedRoom.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          })),
          createdAt: updatedRoom.createdAt
        }
      });

      // Emit success response to joining player
      socket.emit('roomJoined', {
        success: true,
        message: 'Successfully joined room',
        data: {
          roomCode: updatedRoom.roomCode,
          gameState: updatedRoom.gameState,
          playerCount: updatedRoom.players.length,
          players: updatedRoom.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          })),
          createdAt: updatedRoom.createdAt
        }
      });

      console.log(`${playerName} (${socket.id}) joined room ${normalizedRoomCode}`);

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', {
        message: 'Internal server error while joining room',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle room leaving
   * @param {Object} socket - The socket requesting to leave
   * @param {Object} data - Data containing room code
   */
  async handleLeaveRoom(socket, data) {
    try {
      const { roomCode } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Find player
      const player = await Player.findOne({ socketId: socket.id });
      if (!player) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }

      // Find room
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if player is in this room
      const playerInRoom = room.players.find(p => p._id.toString() === player._id.toString());
      if (!playerInRoom) {
        socket.emit('error', {
          message: 'Player is not in this room',
          code: 'PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if the leaving player is the host
      const wasHost = player.isHost;
      
      // Remove player from room
      await room.removePlayer(player._id);

      // Leave socket from room
      socket.leave(normalizedRoomCode);

      // If room becomes empty, keep it alive for potential rejoin
      if (room.players.length === 1) { // Only the leaving player remains
        console.log(`Room ${normalizedRoomCode} is now empty - keeping it alive for potential rejoin`);
        // Don't delete empty rooms immediately - keep them for potential rejoin
        // Rooms will be cleaned up by the periodic cleanup task
      } else {
        // Get updated room data
        const updatedRoom = await GameRoom.findById(room._id).populate('players');
        
        // If the leaving player was the host, assign host status to another player
        if (wasHost && updatedRoom.players.length > 0) {
          const newHost = updatedRoom.players[0]; // Assign to first remaining player
          await Player.findByIdAndUpdate(newHost._id, { isHost: true });
          console.log(`Host status transferred from ${player.name} to ${newHost.name} in room ${normalizedRoomCode}`);
          
          // Update the room data to reflect the new host status
          const refreshedRoom = await GameRoom.findById(room._id).populate('players');
          updatedRoom.players = refreshedRoom.players;
        }

        // Emit room update to remaining players
        this.emitToRoom(normalizedRoomCode, 'roomUpdate', {
          success: true,
          message: `${player.name} left the room`,
          data: {
            roomCode: updatedRoom.roomCode,
            gameState: updatedRoom.gameState,
            playerCount: updatedRoom.players.length,
            players: updatedRoom.players.map(p => ({
              id: p._id,
              name: p.name,
              isHost: p.isHost,
              socketId: p.socketId
            })),
            createdAt: updatedRoom.createdAt
          }
        });
      }

      // Emit success response to leaving player BEFORE deleting player record
      socket.emit('roomLeft', {
        success: true,
        message: 'Successfully left room'
      });

      // Delete player record
      await Player.findByIdAndDelete(player._id);

      console.log(`${player.name} (${socket.id}) left room ${normalizedRoomCode}`);

    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('error', {
        message: 'Internal server error while leaving room',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Generate a random 4-letter room code
   * @returns {string} 4-letter uppercase room code
   */
  generateRoomCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
  }

  /**
   * Handle game start request
   * @param {Object} socket - The socket requesting to start the game
   * @param {Object} data - Data containing room code
   */
  async handleStartGame(socket, data) {
    try {
      const { roomCode } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Find player
      const player = await Player.findOne({ socketId: socket.id });
      if (!player) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }

      // Find room
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if player is in this room
      const playerInRoom = room.players.find(p => p._id.toString() === player._id.toString());
      if (!playerInRoom) {
        socket.emit('error', {
          message: 'Player is not in this room',
          code: 'PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if player is the host
      if (!player.isHost) {
        socket.emit('error', {
          message: 'Only the host can start the game',
          code: 'NOT_HOST'
        });
        return;
      }

      // Check if game is already started
      if (room.gameState !== 'lobby') {
        socket.emit('error', {
          message: 'Game has already started',
          code: 'GAME_ALREADY_STARTED'
        });
        return;
      }

      // Check if there are enough players
      if (room.players.length < 2) {
        socket.emit('error', {
          message: 'At least 2 players required to start the game',
          code: 'NOT_ENOUGH_PLAYERS'
        });
        return;
      }

      // Set game state to hostSetup instead of immediately starting
      room.gameState = 'hostSetup';
      await room.save();

      // Get updated room data
      const updatedRoom = await GameRoom.findById(room._id).populate('players');

      // Emit game started event to all players in the room
      this.emitToRoom(normalizedRoomCode, 'gameStarted', {
        success: true,
        message: 'Game setup started!',
        data: {
          roomCode: updatedRoom.roomCode,
          gameState: updatedRoom.gameState,
          currentPrompt: updatedRoom.currentPrompt,
          gameStartTime: updatedRoom.gameStartTime,
          cookingTimeLimit: updatedRoom.cookingTimeLimit,
          playerCount: updatedRoom.players.length,
          players: updatedRoom.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          }))
        }
      });

      console.log(`Game started in room ${normalizedRoomCode} by ${player.name} (${socket.id})`);

    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', {
        message: 'Internal server error while starting game',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle game continuation after host setup
   * @param {Object} socket - The socket continuing the game
   * @param {Object} data - Data containing room code, category, and difficulty
   */
  async handleContinueGame(socket, data) {
    try {
      const { roomCode, category, difficulty, timerLength } = data;
      
      console.log('Server: handleContinueGame received data:', data);
      console.log('Server: timerLength received:', timerLength);

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Find player
      const player = await Player.findOne({ socketId: socket.id });
      if (!player) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }

      // Find room
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if player is in this room
      const playerInRoom = room.players.find(p => p._id.toString() === player._id.toString());
      if (!playerInRoom) {
        socket.emit('error', {
          message: 'Player is not in this room',
          code: 'PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if player is the host
      if (!player.isHost) {
        socket.emit('error', {
          message: 'Only the host can continue the game',
          code: 'NOT_HOST'
        });
        return;
      }

      // Check if game is in hostSetup state
      if (room.gameState !== 'hostSetup') {
        socket.emit('error', {
          message: 'Game is not in setup state',
          code: 'INVALID_GAME_STATE'
        });
        return;
      }

      // Generate AI prompt based on category and difficulty
      const prompt = await this.aiPromptGenerator.generateContextualPrompt({
        playerCount: room.players.length,
        gameState: 'submitting',
        category: category,
        difficulty: difficulty
      });

      // Select a random location based on category
      console.log('Server: About to select location for category:', category);
      const selectedLocation = this.aiPromptGenerator.selectRandomLocation(category);
      console.log('Server: Selected location result:', selectedLocation);
      console.log('Server: Type of selectedLocation:', typeof selectedLocation);

      // Start the actual game
      await room.startGame(prompt);

      // Get updated room data
      const updatedRoom = await GameRoom.findById(room._id).populate('players');

      // Emit game continued event to all players in the room
      const responseData = {
        success: true,
        message: 'Game started successfully!',
        data: {
          roomCode: updatedRoom.roomCode,
          gameState: updatedRoom.gameState,
          currentPrompt: updatedRoom.currentPrompt,
          gameStartTime: updatedRoom.gameStartTime,
          cookingTimeLimit: updatedRoom.cookingTimeLimit,
          timerLength: timerLength,
          category: category,
          selectedLocation: selectedLocation,
          playerCount: updatedRoom.players.length,
          players: updatedRoom.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          }))
        }
      };
      
      console.log('Sending gameContinued data:', JSON.stringify(responseData, null, 2));
      this.emitToRoom(normalizedRoomCode, 'gameContinued', responseData);

      console.log(`Game continued in room ${normalizedRoomCode} by ${player.name} (${socket.id})`);
      console.log(`Category: ${category}, Difficulty: ${difficulty}, TimerLength: ${timerLength}`);
      console.log(`Prompt: "${prompt}"`);
      console.log(`Selected Location: "${selectedLocation}"`);

    } catch (error) {
      console.error('Error continuing game:', error);
      socket.emit('error', {
        message: 'Internal server error while continuing game',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle next to game screen request (host-only)
   * @param {Object} socket - The socket requesting to go to game screen
   * @param {Object} data - Data containing room code
   */
  async handleNextToGame(socket, data) {
    try {
      const { roomCode } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Find player
      const player = await Player.findOne({ socketId: socket.id });
      if (!player) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }

      // Find room
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if player is in this room
      const playerInRoom = room.players.find(p => p._id.toString() === player._id.toString());
      if (!playerInRoom) {
        socket.emit('error', {
          message: 'Player is not in this room',
          code: 'PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if player is the host
      if (!player.isHost) {
        socket.emit('error', {
          message: 'Only the host can proceed to game screen',
          code: 'NOT_HOST'
        });
        return;
      }

      // Check if game is in submitting state
      if (room.gameState !== 'submitting') {
        socket.emit('error', {
          message: 'Game must be in submitting state to proceed to game screen',
          code: 'INVALID_GAME_STATE'
        });
        return;
      }

      // Update room state to gameScreen
      room.gameState = 'gameScreen';
      await room.save();

      // Emit next to game event to all players in the room
      this.emitToRoom(normalizedRoomCode, 'nextToGame', {
        success: true,
        message: 'Proceeding to game screen!',
        data: {
          roomCode: room.roomCode,
          gameState: 'gameScreen',
          currentPrompt: room.currentPrompt,
          playerCount: room.players.length,
          players: room.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          }))
        }
      });

      console.log(`Next to game screen triggered in room ${normalizedRoomCode} by ${player.name} (${socket.id})`);

    } catch (error) {
      console.error('Error proceeding to game screen:', error);
      socket.emit('error', {
        message: 'Internal server error while proceeding to game screen',
        code: 'INTERNAL_ERROR'
      });
    }
  }


  /**
   * Handle voting start request (host-only)
   * @param {Object} socket - The socket requesting to start voting
   * @param {Object} data - Data containing room code
   */
  async handleStartVoting(socket, data) {
    try {
      const { roomCode } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Find player
      const player = await Player.findOne({ socketId: socket.id });
      if (!player) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }

      // Find room
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if player is in this room
      const playerInRoom = room.players.find(p => p._id.toString() === player._id.toString());
      if (!playerInRoom) {
        socket.emit('error', {
          message: 'Player is not in this room',
          code: 'PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if player is the host
      if (!player.isHost) {
        socket.emit('error', {
          message: 'Only the host can start voting',
          code: 'NOT_HOST'
        });
        return;
      }

      // Check if game is in gameScreen state (cooking phase)
      if (room.gameState !== 'gameScreen') {
        socket.emit('error', {
          message: 'Game must be in cooking phase to start voting',
          code: 'INVALID_GAME_STATE'
        });
        return;
      }

      // Start voting phase
      await room.startVoting();

      // Get updated room data
      const updatedRoom = await GameRoom.findById(room._id).populate('players');

      // Emit voting started event to all players in the room
      this.emitToRoom(normalizedRoomCode, 'votingStarted', {
        success: true,
        message: 'Voting phase has begun!',
        data: {
          roomCode: updatedRoom.roomCode,
          gameState: updatedRoom.gameState,
          votingTimeLimit: updatedRoom.votingTimeLimit,
          votingStartTime: updatedRoom.votingStartTime,
          playerCount: updatedRoom.players.length,
          players: updatedRoom.players.map(p => ({
            id: p._id,
            name: p.name,
            isHost: p.isHost,
            socketId: p.socketId
          }))
        }
      });

      console.log(`Voting started in room ${normalizedRoomCode} by ${player.name} (${socket.id})`);

    } catch (error) {
      console.error('Error starting voting:', error);
      socket.emit('error', {
        message: 'Internal server error while starting voting',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle vote casting
   * @param {Object} socket - The socket casting the vote
   * @param {Object} data - Data containing room code and player ID
   */
  async handleCastVote(socket, data) {
    try {
      const { roomCode, playerId, rating } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      if (!playerId || typeof playerId !== 'string') {
        socket.emit('error', {
          message: 'Player ID is required',
          code: 'INVALID_PLAYER_ID'
        });
        return;
      }

      if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        socket.emit('error', {
          message: 'Rating must be a number between 1 and 5',
          code: 'INVALID_RATING'
        });
        return;
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase();

      // Find voter player
      const voter = await Player.findOne({ socketId: socket.id });
      if (!voter) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND'
        });
        return;
      }

      // Find room
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }

      // Check if voter is in this room
      const voterInRoom = room.players.find(p => p._id.toString() === voter._id.toString());
      if (!voterInRoom) {
        socket.emit('error', {
          message: 'Player is not in this room',
          code: 'PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if game is in voting state
      if (room.gameState !== 'voting') {
        socket.emit('error', {
          message: 'Game is not in voting phase',
          code: 'INVALID_GAME_STATE'
        });
        return;
      }

      // Check if voting time has expired
      if (room.isVotingTimeExpired()) {
        socket.emit('error', {
          message: 'Voting time has expired',
          code: 'VOTING_TIME_EXPIRED'
        });
        return;
      }

      // Find the player being voted for
      const targetPlayer = await Player.findById(playerId);
      if (!targetPlayer) {
        socket.emit('error', {
          message: 'Player not found',
          code: 'TARGET_PLAYER_NOT_FOUND'
        });
        return;
      }

      // Check if target player is in this room
      const targetPlayerInRoom = room.players.find(p => p._id.toString() === targetPlayer._id.toString());
      if (!targetPlayerInRoom) {
        socket.emit('error', {
          message: 'Target player is not in this room',
          code: 'TARGET_PLAYER_NOT_IN_ROOM'
        });
        return;
      }

      // Check if voter is trying to vote for themselves
      if (voter._id.toString() === targetPlayer._id.toString()) {
        socket.emit('error', {
          message: 'You cannot vote for yourself',
          code: 'CANNOT_VOTE_SELF'
        });
        return;
      }

      // Check if voter has already voted for this player
      const existingVote = room.votes?.find(vote => 
        vote.voterId.toString() === voter._id.toString() && 
        vote.targetPlayerId.toString() === targetPlayer._id.toString()
      );

      if (existingVote) {
        socket.emit('error', {
          message: 'You have already voted for this player',
          code: 'ALREADY_VOTED'
        });
        return;
      }

      // Add vote to room
      if (!room.votes) {
        room.votes = [];
      }
      
      room.votes.push({
        voterId: voter._id,
        targetPlayerId: targetPlayer._id,
        rating: rating,
        votedAt: new Date()
      });

      await room.save();

      // Check if all players have voted
      const totalVotes = room.votes.length;
      const allPlayersVoted = totalVotes >= (room.players.length * (room.players.length - 1));

      // Emit vote success to the voting player
      socket.emit('voteSuccess', {
        success: true,
        message: `Vote cast for ${targetPlayer.name}!`,
        data: {
          targetPlayerId: targetPlayer._id,
          targetPlayerName: targetPlayer.name,
          rating: rating,
          totalVotes: totalVotes,
          allPlayersVoted: allPlayersVoted,
          votedAt: new Date().toISOString()
        }
      });

      // Emit vote update to all players in the room
      this.emitToRoom(normalizedRoomCode, 'voteUpdate', {
        success: true,
        message: `${voter.name} voted ${rating} stars for ${targetPlayer.name}`,
        data: {
          voterId: voter._id,
          voterName: voter.name,
          targetPlayerId: targetPlayer._id,
          targetPlayerName: targetPlayer.name,
          rating: rating,
          totalVotes: totalVotes,
          allPlayersVoted: allPlayersVoted,
          remainingTime: room.getRemainingVotingTime()
        }
      });

      // If all players have voted, automatically transition to results phase
      if (allPlayersVoted) {
        await room.showResults();
        
        // Calculate results
        const playerRatings = {};
        room.players.forEach(player => {
          const votesForPlayer = room.votes.filter(vote => 
            vote.targetPlayerId.toString() === player._id.toString()
          );
          const totalRating = votesForPlayer.reduce((sum, vote) => sum + vote.rating, 0);
          const averageRating = votesForPlayer.length > 0 ? totalRating / votesForPlayer.length : 0;
          
          playerRatings[player._id.toString()] = {
            playerId: player._id,
            playerName: player.name,
            totalRating: totalRating,
            averageRating: averageRating,
            voteCount: votesForPlayer.length
          };
        });

        // Find winner (player with highest average rating)
        const sortedPlayers = Object.values(playerRatings).sort((a, b) => b.averageRating - a.averageRating);
        const winner = sortedPlayers.length > 0 ? sortedPlayers[0] : null;

        // Emit results ready event to all players
        this.emitToRoom(normalizedRoomCode, 'resultsReady', {
          success: true,
          message: 'All votes are in! Results are ready.',
          data: {
            roomCode: room.roomCode,
            gameState: room.gameState,
            results: Object.values(playerRatings),
            winner: winner,
            totalVotes: totalVotes
          }
        });

        console.log(`All players voted in room ${normalizedRoomCode}, results phase started`);
      }

      console.log(`${voter.name} (${socket.id}) voted ${rating} stars for ${targetPlayer.name} in room ${normalizedRoomCode}`);

    } catch (error) {
      console.error('Error casting vote:', error);
      socket.emit('error', {
        message: 'Internal server error while casting vote',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Start periodic cleanup of old empty rooms
   * Runs every 10 minutes to clean up rooms that have been empty for more than 30 minutes
   */
  startPeriodicCleanup() {
    // Run cleanup every 10 minutes
    setInterval(async () => {
      try {
        await this.cleanupOldEmptyRooms();
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Also run cleanup immediately on startup
    setTimeout(async () => {
      try {
        await this.cleanupOldEmptyRooms();
      } catch (error) {
        console.error('Error during initial cleanup:', error);
      }
    }, 5000); // Wait 5 seconds after startup
  }

  /**
   * Clean up rooms that have been empty for more than 30 minutes
   */
  async cleanupOldEmptyRooms() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      // Find empty rooms that were last updated more than 30 minutes ago
      const oldEmptyRooms = await GameRoom.find({
        players: { $size: 0 },
        updatedAt: { $lt: thirtyMinutesAgo }
      });

      if (oldEmptyRooms.length > 0) {
        console.log(`Cleaning up ${oldEmptyRooms.length} old empty rooms`);
        
        for (const room of oldEmptyRooms) {
          console.log(`Deleting old empty room: ${room.roomCode} (last updated: ${room.updatedAt})`);
          await GameRoom.findByIdAndDelete(room._id);
        }
        
        console.log(`Successfully cleaned up ${oldEmptyRooms.length} old empty rooms`);
      }
    } catch (error) {
      console.error('Error cleaning up old empty rooms:', error);
    }
  }
}

module.exports = SocketManager;
