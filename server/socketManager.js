const Player = require('./models/player');
const GameRoom = require('./models/gameRoom');
const Submission = require('./models/submission');
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

      socket.on('submitImage', (data) => {
        this.handleSubmitImage(socket, data);
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
            // Remove player from room with error handling
            await room.removePlayer(player._id);
            
            // Get updated room to check if it's empty
            const updatedRoom = await GameRoom.findById(room._id).populate('players');
            
            if (updatedRoom && updatedRoom.players.length === 0) {
              console.log(`Deleting empty room: ${room.roomCode}`);
              await GameRoom.findByIdAndDelete(room._id);
            } else if (updatedRoom) {
              // Notify remaining players about the disconnection
              this.io.to(room.roomCode).emit('playerLeft', {
                playerId: player._id,
                playerName: player.name,
                message: `${player.name} has left the room`,
                remainingPlayers: updatedRoom.players.length
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
      const nameExists = room.players.some(p => p.name.toLowerCase() === playerName.trim().toLowerCase());
      if (nameExists) {
        socket.emit('error', {
          message: 'Player name is already taken in this room',
          code: 'NAME_ALREADY_TAKEN'
        });
        return;
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

      // Remove player from room
      await room.removePlayer(player._id);

      // Leave socket from room
      socket.leave(normalizedRoomCode);

      // If room becomes empty, delete it
      if (room.players.length === 1) { // Only the leaving player remains
        await GameRoom.findByIdAndDelete(room._id);
        console.log(`Room ${normalizedRoomCode} deleted as it became empty`);
      } else {
        // Get updated room data
        const updatedRoom = await GameRoom.findById(room._id).populate('players');

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

      // Generate AI prompt
      const prompt = await this.aiPromptGenerator.generateContextualPrompt({
        playerCount: room.players.length,
        gameState: room.gameState
      });

      // Start the game
      await room.startGame(prompt);

      // Get updated room data
      const updatedRoom = await GameRoom.findById(room._id).populate('players');

      // Emit game started event to all players in the room
      this.emitToRoom(normalizedRoomCode, 'gameStarted', {
        success: true,
        message: 'Game started successfully!',
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
      console.log(`Prompt: "${prompt}"`);

    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', {
        message: 'Internal server error while starting game',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Handle image submission
   * @param {Object} socket - The socket submitting the image
   * @param {Object} data - Data containing room code and image data
   */
  async handleSubmitImage(socket, data) {
    try {
      const { roomCode, imageData, fileName, fileSize, mimeType } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      if (!imageData || typeof imageData !== 'string') {
        socket.emit('error', {
          message: 'Image data is required',
          code: 'INVALID_IMAGE_DATA'
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

      // Check if game is in submitting state
      if (room.gameState !== 'submitting') {
        socket.emit('error', {
          message: 'Game is not in submission phase',
          code: 'INVALID_GAME_STATE'
        });
        return;
      }

      // Check if cooking time has expired
      if (room.isCookingTimeExpired()) {
        socket.emit('error', {
          message: 'Cooking time has expired',
          code: 'COOKING_TIME_EXPIRED'
        });
        return;
      }

      // Check if player has already submitted
      const existingSubmission = await Submission.findOne({ 
        playerId: player._id, 
        roomId: room._id 
      });
      
      if (existingSubmission) {
        socket.emit('error', {
          message: 'You have already submitted an image for this round',
          code: 'ALREADY_SUBMITTED'
        });
        return;
      }

      // Create mock file object for validation
      const mockFile = {
        originalname: fileName || 'submission.jpg',
        mimetype: mimeType || 'image/jpeg',
        size: fileSize || imageData.length,
        buffer: Buffer.from(imageData, 'base64')
      };

      // Upload image using the image uploader service
      const uploadResult = await this.imageUploader.uploadImage(mockFile, player._id);
      
      if (!uploadResult.success) {
        socket.emit('error', {
          message: `Image upload failed: ${uploadResult.error}`,
          code: 'UPLOAD_FAILED'
        });
        return;
      }

      // Create submission record
      const submission = new Submission({
        playerId: player._id,
        roomId: room._id,
        imageUrl: uploadResult.imageUrl
      });

      await submission.save();

      // Get all submissions for this room to check if all players have submitted
      const allSubmissions = await Submission.find({ roomId: room._id });
      const allPlayersSubmitted = allSubmissions.length === room.players.length;

      // Emit submission success to the submitting player
      socket.emit('submissionSuccess', {
        success: true,
        message: 'Image submitted successfully!',
        data: {
          submissionId: submission._id,
          imageUrl: uploadResult.imageUrl,
          submittedAt: submission.createdAt,
          allPlayersSubmitted: allPlayersSubmitted,
          submissionsCount: allSubmissions.length,
          totalPlayers: room.players.length
        }
      });

      // Emit submission update to all players in the room
      this.emitToRoom(normalizedRoomCode, 'submissionUpdate', {
        success: true,
        message: `${player.name} has submitted their dish!`,
        data: {
          playerId: player._id,
          playerName: player.name,
          submissionsCount: allSubmissions.length,
          totalPlayers: room.players.length,
          allPlayersSubmitted: allPlayersSubmitted,
          remainingTime: room.getRemainingCookingTime()
        }
      });

      // If all players have submitted, automatically transition to voting phase
      if (allPlayersSubmitted) {
        await room.startVoting();
        
        // Get updated room data
        const updatedRoom = await GameRoom.findById(room._id).populate('players');
        
        // Emit voting started event to all players
        this.emitToRoom(normalizedRoomCode, 'votingStarted', {
          success: true,
          message: 'All players have submitted! Voting phase has begun.',
          data: {
            roomCode: updatedRoom.roomCode,
            gameState: updatedRoom.gameState,
            votingTimeLimit: updatedRoom.votingTimeLimit,
            playerCount: updatedRoom.players.length,
            players: updatedRoom.players.map(p => ({
              id: p._id,
              name: p.name,
              isHost: p.isHost,
              socketId: p.socketId
            }))
          }
        });

        console.log(`All players submitted in room ${normalizedRoomCode}, voting phase started`);
      }

      console.log(`${player.name} (${socket.id}) submitted image in room ${normalizedRoomCode}`);

    } catch (error) {
      console.error('Error submitting image:', error);
      socket.emit('error', {
        message: 'Internal server error while submitting image',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

module.exports = SocketManager;
