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
    this.startRoomCleanupService();
  }

  /**
   * Set up all Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', async (socket) => {
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

      // Voting events
      socket.on('startVoting', (data) => {
        this.handleStartVoting(socket, data);
      });

      socket.on('castVote', (data) => {
        this.handleCastVote(socket, data);
      });

      // Heartbeat event for connection monitoring
      socket.on('heartbeat', () => {
        this.handleHeartbeat(socket);
      });

      // Clean up any orphaned players with this socket ID (shouldn't happen, but safety check)
      try {
        const orphanedPlayer = await Player.findOne({ socketId: socket.id });
        if (orphanedPlayer) {
          console.log(`Cleaning up orphaned player ${orphanedPlayer.name} with socket ${socket.id}`);
          await this.cleanupPlayer(orphanedPlayer);
        }

        // Log successful connection
        socket.emit('connected', {
          message: 'Successfully connected to The Kitchen server',
          socketId: socket.id,
          timestamp: new Date().toISOString(),
          isReconnection: false
        });
      } catch (error) {
        console.error('Error handling connection:', error);
        socket.emit('connected', {
          message: 'Successfully connected to The Kitchen server',
          socketId: socket.id,
          timestamp: new Date().toISOString(),
          isReconnection: false
        });
      }
    });
  }

  /**
   * Clean up a player from database and all rooms
   * @param {Object} player - The player to clean up
   */
  async cleanupPlayer(player) {
    try {
      console.log(`Cleaning up player ${player.name} (${player.socketId})`);
      
      // Find rooms containing this player
      const rooms = await GameRoom.find({ 
        players: player._id 
      }).populate('players');
      
      for (const room of rooms) {
        try {
          // Remove player from the room
          const updatedRoom = await GameRoom.findByIdAndUpdate(
            room._id,
            { $pull: { players: player._id } },
            { new: true }
          ).populate('players');
          
          if (updatedRoom) {
            // If this was the host and there are other players, make the first remaining player the host
            if (player.isHost && updatedRoom.players.length > 0) {
              const newHost = updatedRoom.players[0];
              await Player.findByIdAndUpdate(newHost._id, { isHost: true });
              
              // Update the room data with new host
              const roomWithNewHost = await GameRoom.findById(room._id).populate('players');
              
              // Emit room update with new host
              this.io.to(room.roomCode).emit('roomUpdate', {
                success: true,
                message: `${player.name} disconnected. ${newHost.name} is now the host.`,
                data: {
                  roomCode: roomWithNewHost.roomCode,
                  gameState: roomWithNewHost.gameState,
                  playerCount: roomWithNewHost.players.length,
                  players: roomWithNewHost.players.map(p => ({
                    id: p._id,
                    name: p.name,
                    isHost: p.isHost,
                    socketId: p.socketId
                  })),
                  currentPrompt: roomWithNewHost.currentPrompt,
                  createdAt: roomWithNewHost.createdAt
                }
              });
              
              console.log(`Player ${player.name} cleaned up. ${newHost.name} is now the host of room ${room.roomCode}`);
            } else {
              // Emit room update to remaining players
              this.io.to(room.roomCode).emit('roomUpdate', {
                success: true,
                message: `${player.name} disconnected`,
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
                  currentPrompt: updatedRoom.currentPrompt,
                  createdAt: updatedRoom.createdAt
                }
              });
              
              console.log(`Notified room ${room.roomCode} about ${player.name}'s cleanup`);
            }
            
            // Don't delete room immediately - let the cleanup service handle it
            // This allows players to rejoin after refresh
            console.log(`Room ${room.roomCode} has ${updatedRoom.players.length} players remaining`);
          }
        } catch (error) {
          console.error(`Error cleaning up player from room ${room.roomCode}:`, error.message);
        }
      }
      
      // Delete the player from the database
      await Player.findByIdAndDelete(player._id);
      console.log(`Player ${player.name} removed from database`);
      
    } catch (error) {
      console.error('Error cleaning up player:', error);
    }
  }

  /**
   * Handle user disconnection - mark as disconnected but keep in room for rejoin
   * @param {Object} socket - The disconnected socket
   */
  async handleDisconnect(socket) {
    try {
      console.log(`User disconnected: ${socket.id}`);
      
      // Find player by socket ID
      const player = await Player.findOne({ socketId: socket.id });
      
      if (player) {
        console.log(`Player ${player.name} (${socket.id}) disconnected - marking as disconnected but keeping in room`);
        
        // Mark player as disconnected but keep them in the room for rejoin
        player.isConnected = false;
        player.disconnectTime = new Date();
        await player.save();
        
        // Notify room about disconnection
        await this.notifyRoomAboutDisconnection(player);
        
        // If this was the host and there are other connected players, promote one to host
        if (player.isHost) {
          const rooms = await GameRoom.find({ players: player._id }).populate('players');
          for (const room of rooms) {
            const connectedPlayers = room.players.filter(p => p.isConnected && p._id.toString() !== player._id.toString());
            if (connectedPlayers.length > 0) {
              const newHost = connectedPlayers[0];
              await Player.findByIdAndUpdate(newHost._id, { isHost: true });
              
              // Notify room about host change
              this.emitToRoom(room.roomCode, 'roomUpdate', {
                success: true,
                message: `${player.name} disconnected. ${newHost.name} is now the host.`,
                data: {
                  roomCode: room.roomCode,
                  gameState: room.gameState,
                  playerCount: room.players.length,
                  players: room.players.map(p => ({
                    id: p._id,
                    name: p.name,
                    isHost: p.isHost,
                    socketId: p.socketId,
                    isConnected: p.isConnected
                  })),
                  currentPrompt: room.currentPrompt,
                  createdAt: room.createdAt
                }
              });
              
              console.log(`Player ${player.name} disconnected. ${newHost.name} is now the host of room ${room.roomCode}`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }

  /**
   * Notify room about player disconnection
   * @param {Object} player - The disconnected player
   */
  async notifyRoomAboutDisconnection(player) {
    try {
      // Find rooms containing this player
      const rooms = await GameRoom.find({ 
        players: player._id 
      }).populate('players');
      
      for (const room of rooms) {
        // Emit disconnection notification to room
        this.emitToRoom(room.roomCode, 'playerDisconnected', {
          success: true,
          message: `${player.name} is cooking`,
          data: {
            playerId: player._id,
            playerName: player.name,
            roomCode: room.roomCode,
            gameState: room.gameState,
            playerCount: room.players.length,
            players: room.players.map(p => ({
              id: p._id,
              name: p.name,
              isHost: p.isHost,
              socketId: p.socketId,
              isConnected: p.isConnected
            })),
            currentPrompt: room.currentPrompt,
            createdAt: room.createdAt
          }
        });
        
        console.log(`Notified room ${room.roomCode} about ${player.name}'s disconnection`);
      }
    } catch (error) {
      console.error('Error notifying room about disconnection:', error);
    }
  }


  /**
   * Handle heartbeat from client
   * @param {Object} socket - The socket sending heartbeat
   */
  async handleHeartbeat(socket) {
    try {
      const player = await Player.findOne({ socketId: socket.id });
      if (player) {
        player.lastSeen = new Date();
        await player.save();
      }
    } catch (error) {
      console.error('Error handling heartbeat:', error);
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
    console.log(`Emitting ${event} to room ${roomCode}:`, data);
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
        // Clean up the existing player (they likely refreshed)
        console.log(`Player already exists for socket ${socket.id}, cleaning up old player`);
        await this.cleanupPlayer(existingPlayer);
      }

      // Create player
      const player = new Player({
        socketId: socket.id,
        name: playerName.trim(),
        isHost: true,
        isConnected: true,
        lastSeen: new Date()
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
            socketId: p.socketId,
            isConnected: p.isConnected
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
      console.log(`Looking for room with code: ${normalizedRoomCode}`);
      const room = await GameRoom.findOne({ roomCode: normalizedRoomCode }).populate('players');
      if (!room) {
        console.log(`Room ${normalizedRoomCode} not found in database`);
        socket.emit('error', {
          message: 'Room not found. Please check the room code.',
          code: 'ROOM_NOT_FOUND'
        });
        return;
      }
      console.log(`Room ${normalizedRoomCode} found with ${room.players.length} players`);

      // Check if room is full (assuming max 8 players)
      if (room.players.length >= 8) {
        socket.emit('error', {
          message: 'Room is full. Maximum 8 players allowed.',
          code: 'ROOM_FULL'
        });
        return;
      }

      // Check if a player with the same name already exists in the room (and is connected)
      const existingPlayerWithSameName = room.players.find(p => 
        p.name.toLowerCase() === playerName.trim().toLowerCase() && p.isConnected
      );
      
      if (existingPlayerWithSameName) {
        socket.emit('error', {
          message: 'A player with this name is already in the room. Please choose a different name.',
          code: 'NAME_ALREADY_EXISTS'
        });
        return;
      }

      // First, check if there's a disconnected player with the same name in this room
      // This handles the case where someone refreshes and tries to rejoin with the same name
      const disconnectedPlayerInRoom = room.players.find(p => 
        p.name.toLowerCase() === playerName.trim().toLowerCase() && !p.isConnected
      );
      
      if (disconnectedPlayerInRoom) {
        console.log(`Found disconnected player ${playerName} in room ${normalizedRoomCode}, reconnecting them`);
        
        // Update the disconnected player's socket ID and connection status
        disconnectedPlayerInRoom.socketId = socket.id;
        disconnectedPlayerInRoom.isConnected = true;
        disconnectedPlayerInRoom.lastSeen = new Date();
        disconnectedPlayerInRoom.disconnectTime = null;
        await disconnectedPlayerInRoom.save();
        
        // Simple rejoin - ensure they don't become host if there's already a host
        // Only make them host if there's no current host in the room
        const currentHost = room.players.find(p => p.isConnected && p.isHost);
        if (!currentHost) {
          // No current host, make the rejoining player the host
          await Player.findByIdAndUpdate(disconnectedPlayerInRoom._id, { isHost: true });
          console.log(`Made ${disconnectedPlayerInRoom.name} the host (no current host)`);
        } else {
          // There's already a host, ensure rejoining player is not host
          await Player.findByIdAndUpdate(disconnectedPlayerInRoom._id, { isHost: false });
          console.log(`Kept ${disconnectedPlayerInRoom.name} as regular player (${currentHost.name} is host)`);
        }
        
        // Join socket to room
        socket.join(normalizedRoomCode);
        
        // Get updated room data
        const updatedRoom = await GameRoom.findById(room._id).populate('players');
        
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
              socketId: p.socketId,
              isConnected: p.isConnected
            })),
            currentPrompt: updatedRoom.currentPrompt,
            createdAt: updatedRoom.createdAt
          }
        });

        // Notify room about reconnection
        this.emitToRoom(normalizedRoomCode, 'playerReconnected', {
          success: true,
          message: `${disconnectedPlayerInRoom.name} is back from cooking`,
          data: {
            playerId: disconnectedPlayerInRoom._id,
            playerName: disconnectedPlayerInRoom.name,
            roomCode: updatedRoom.roomCode,
            gameState: updatedRoom.gameState,
            playerCount: updatedRoom.players.length,
            players: updatedRoom.players.map(p => ({
              id: p._id,
              name: p.name,
              isHost: p.isHost,
              socketId: p.socketId,
              isConnected: p.isConnected
            })),
            currentPrompt: updatedRoom.currentPrompt,
            createdAt: updatedRoom.createdAt
          }
        });
        
        console.log(`${disconnectedPlayerInRoom.name} (${socket.id}) reconnected to room ${normalizedRoomCode}`);
        return;
      }

      // Also check for any disconnected players with the same socket ID (shouldn't happen but safety check)
      const disconnectedPlayerWithSocket = room.players.find(p => 
        p.socketId === socket.id && !p.isConnected
      );
      
      if (disconnectedPlayerWithSocket) {
        console.log(`Found disconnected player with same socket ID ${socket.id} in room ${normalizedRoomCode}, reconnecting them`);
        
        // Update the disconnected player's socket ID and connection status
        disconnectedPlayerWithSocket.socketId = socket.id;
        disconnectedPlayerWithSocket.isConnected = true;
        disconnectedPlayerWithSocket.lastSeen = new Date();
        disconnectedPlayerWithSocket.disconnectTime = null;
        await disconnectedPlayerWithSocket.save();
        
        // Simple rejoin - ensure they don't become host if there's already a host
        // Only make them host if there's no current host in the room
        const currentHost2 = room.players.find(p => p.isConnected && p.isHost);
        if (!currentHost2) {
          // No current host, make the rejoining player the host
          await Player.findByIdAndUpdate(disconnectedPlayerWithSocket._id, { isHost: true });
          console.log(`Made ${disconnectedPlayerWithSocket.name} the host (no current host)`);
        } else {
          // There's already a host, ensure rejoining player is not host
          await Player.findByIdAndUpdate(disconnectedPlayerWithSocket._id, { isHost: false });
          console.log(`Kept ${disconnectedPlayerWithSocket.name} as regular player (${currentHost2.name} is host)`);
        }
        
        // Join socket to room
        socket.join(normalizedRoomCode);
        
        // Get updated room data
        const updatedRoom = await GameRoom.findById(room._id).populate('players');
        
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
              socketId: p.socketId,
              isConnected: p.isConnected
            })),
            currentPrompt: updatedRoom.currentPrompt,
            createdAt: updatedRoom.createdAt
          }
        });

        // Notify room about reconnection
        this.emitToRoom(normalizedRoomCode, 'playerReconnected', {
          success: true,
          message: `${disconnectedPlayerWithSocket.name} is back from cooking`,
          data: {
            playerId: disconnectedPlayerWithSocket._id,
            playerName: disconnectedPlayerWithSocket.name,
            roomCode: updatedRoom.roomCode,
            gameState: updatedRoom.gameState,
            playerCount: updatedRoom.players.length,
            players: updatedRoom.players.map(p => ({
              id: p._id,
              name: p.name,
              isHost: p.isHost,
              socketId: p.socketId,
              isConnected: p.isConnected
            })),
            currentPrompt: updatedRoom.currentPrompt,
            createdAt: updatedRoom.createdAt
          }
        });
        
        console.log(`${disconnectedPlayerWithSocket.name} (${socket.id}) reconnected to room ${normalizedRoomCode}`);
        return;
      }

      // Check if player already exists with this socket ID
      const existingPlayer = await Player.findOne({ socketId: socket.id });
      if (existingPlayer) {
        // Check if this player is already in the room they're trying to join
        const playerInRoom = room.players.find(p => p._id.toString() === existingPlayer._id.toString());
        if (playerInRoom) {
          // Player is already in this room, just update their socket ID and mark as connected
          console.log(`Player ${existingPlayer.name} is already in room ${normalizedRoomCode}, updating socket ID and marking as connected`);
          
          // Update socket ID and connection status
          existingPlayer.socketId = socket.id;
          existingPlayer.isConnected = true;
          existingPlayer.lastSeen = new Date();
          existingPlayer.disconnectTime = null;
          await existingPlayer.save();
          
          // Join socket to room
          socket.join(normalizedRoomCode);
          
          // Get updated room data
          const updatedRoom = await GameRoom.findById(room._id).populate('players');
          
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
                socketId: p.socketId,
                isConnected: p.isConnected
              })),
              currentPrompt: updatedRoom.currentPrompt,
              createdAt: updatedRoom.createdAt
            }
          });

          // Notify room about reconnection
          this.emitToRoom(normalizedRoomCode, 'playerReconnected', {
            success: true,
            message: `${existingPlayer.name} is back from cooking`,
            data: {
              playerId: existingPlayer._id,
              playerName: existingPlayer.name,
              roomCode: updatedRoom.roomCode,
              gameState: updatedRoom.gameState,
              playerCount: updatedRoom.players.length,
              players: updatedRoom.players.map(p => ({
                id: p._id,
                name: p.name,
                isHost: p.isHost,
                socketId: p.socketId,
                isConnected: p.isConnected
              })),
              currentPrompt: updatedRoom.currentPrompt,
              createdAt: updatedRoom.createdAt
            }
          });
          
          console.log(`${existingPlayer.name} (${socket.id}) reconnected to room ${normalizedRoomCode}`);
          return;
        } else {
          // Player exists but not in this room, clean them up
          console.log(`Player already exists for socket ${socket.id}, cleaning up old player`);
          await this.cleanupPlayer(existingPlayer);
        }
      }



      // Create player
      const player = new Player({
        socketId: socket.id,
        name: playerName.trim(),
        isHost: false,
        isConnected: true,
        lastSeen: new Date()
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
            socketId: p.socketId,
            isConnected: p.isConnected
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
            socketId: p.socketId,
            isConnected: p.isConnected
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

      // Get updated room data to check remaining players
      const updatedRoom = await GameRoom.findById(room._id).populate('players');
      
      // Check if there are any players left in the room
      if (updatedRoom.players.length === 0) {
        // No players left, delete the room
        await GameRoom.findByIdAndDelete(room._id);
        console.log(`Room ${normalizedRoomCode} deleted as it became empty`);
      } else {
        // There are still connected players, notify them
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
              socketId: p.socketId,
              isConnected: p.isConnected
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

      // Check if game is in submitting state
      if (room.gameState !== 'submitting') {
        socket.emit('error', {
          message: 'Game must be in submission phase to start voting',
          code: 'INVALID_GAME_STATE'
        });
        return;
      }

      // Check if there are submissions to vote on
      const submissions = await Submission.find({ roomId: room._id });
      if (submissions.length === 0) {
        socket.emit('error', {
          message: 'No submissions found to vote on',
          code: 'NO_SUBMISSIONS'
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
          submissionsCount: submissions.length,
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
   * @param {Object} data - Data containing room code and submission ID
   */
  async handleCastVote(socket, data) {
    try {
      const { roomCode, submissionId } = data;

      // Validate input
      if (!roomCode || typeof roomCode !== 'string' || roomCode.trim().length !== 4) {
        socket.emit('error', {
          message: 'Room code must be exactly 4 characters',
          code: 'INVALID_ROOM_CODE'
        });
        return;
      }

      if (!submissionId || typeof submissionId !== 'string') {
        socket.emit('error', {
          message: 'Submission ID is required',
          code: 'INVALID_SUBMISSION_ID'
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

      // Find submission
      const submission = await Submission.findById(submissionId).populate('playerId', 'name');
      if (!submission) {
        socket.emit('error', {
          message: 'Submission not found',
          code: 'SUBMISSION_NOT_FOUND'
        });
        return;
      }

      // Check if submission belongs to this room
      if (submission.roomId.toString() !== room._id.toString()) {
        socket.emit('error', {
          message: 'Submission does not belong to this room',
          code: 'SUBMISSION_NOT_IN_ROOM'
        });
        return;
      }

      try {
        // Add vote to submission
        await submission.addVote(player._id);

        // Get updated submission with vote count
        const updatedSubmission = await Submission.findById(submissionId).populate('playerId', 'name');

        // Get all submissions for this room to check if all players have voted
        const allSubmissions = await Submission.find({ roomId: room._id }).populate('playerId', 'name');
        const totalVotes = allSubmissions.reduce((sum, sub) => sum + sub.votes.length, 0);
        const allPlayersVoted = totalVotes === room.players.length;

        // Emit vote success to the voting player
        socket.emit('voteSuccess', {
          success: true,
          message: `Vote cast for ${updatedSubmission.playerId.name}'s submission!`,
          data: {
            submissionId: updatedSubmission._id,
            submissionOwner: updatedSubmission.playerId.name,
            voteCount: updatedSubmission.voteCount,
            totalVotes: totalVotes,
            allPlayersVoted: allPlayersVoted,
            votedAt: new Date().toISOString()
          }
        });

        // Emit vote update to all players in the room
        this.emitToRoom(normalizedRoomCode, 'voteUpdate', {
          success: true,
          message: `${player.name} voted for ${updatedSubmission.playerId.name}'s submission`,
          data: {
            voterId: player._id,
            voterName: player.name,
            submissionId: updatedSubmission._id,
            submissionOwner: updatedSubmission.playerId.name,
            voteCount: updatedSubmission.voteCount,
            totalVotes: totalVotes,
            allPlayersVoted: allPlayersVoted,
            remainingTime: room.getRemainingVotingTime()
          }
        });

        // If all players have voted, automatically transition to results phase
        if (allPlayersVoted) {
          await room.endVoting();
          
          // Get updated room data
          const updatedRoom = await GameRoom.findById(room._id).populate('players');
          
          // Get all submissions with vote counts for results
          const submissionsWithVotes = await Submission.find({ roomId: room._id })
            .populate('playerId', 'name')
            .sort({ voteCount: -1 });

          // Find winner (submission with most votes, excluding submissions with null playerId)
          const validSubmissions = submissionsWithVotes.filter(sub => sub.playerId);
          const winner = validSubmissions.length > 0 ? validSubmissions[0] : null;

          // Emit results event to all players
          this.emitToRoom(normalizedRoomCode, 'resultsReady', {
            success: true,
            message: 'All players have voted! Results are ready.',
            data: {
              roomCode: updatedRoom.roomCode,
              gameState: updatedRoom.gameState,
              winner: winner ? {
                submissionId: winner._id,
                playerId: winner.playerId._id,
                playerName: winner.playerId.name,
                voteCount: winner.voteCount,
                imageUrl: winner.imageUrl
              } : null,
              submissions: submissionsWithVotes
                .filter(sub => sub.playerId) // Filter out submissions with null playerId
                .map(sub => ({
                  submissionId: sub._id,
                  playerId: sub.playerId._id,
                  playerName: sub.playerId.name,
                  voteCount: sub.voteCount,
                  imageUrl: sub.imageUrl
                })),
              playerCount: updatedRoom.players.length,
              players: updatedRoom.players.map(p => ({
                id: p._id,
                name: p.name,
                isHost: p.isHost,
                socketId: p.socketId
              }))
            }
          });

          console.log(`All players voted in room ${normalizedRoomCode}, results phase started`);
        }

        console.log(`${player.name} (${socket.id}) voted for submission ${submissionId} in room ${normalizedRoomCode}`);

      } catch (voteError) {
        // Handle vote validation errors
        if (voteError.message === 'Player has already voted for this submission') {
          socket.emit('error', {
            message: 'You have already voted for this submission',
            code: 'ALREADY_VOTED'
          });
          return;
        }

        if (voteError.message === 'Players cannot vote for their own submission') {
          socket.emit('error', {
            message: 'You cannot vote for your own submission',
            code: 'SELF_VOTE_NOT_ALLOWED'
          });
          return;
        }

        throw voteError;
      }

    } catch (error) {
      console.error('Error casting vote:', error);
      socket.emit('error', {
        message: 'Internal server error while casting vote',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * Start the room cleanup service to remove empty rooms after a delay
   */
  startRoomCleanupService() {
    // Run cleanup every 30 minutes to remove empty rooms that are older than 1 hour
    setInterval(async () => {
      try {
        await this.cleanupEmptyRooms();
      } catch (error) {
        console.error('Error in room cleanup service:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes

    console.log('Room cleanup service started - will run every 30 minutes for empty rooms');
  }

  /**
   * Clean up empty rooms that have been empty for more than 1 hour
   */
  async cleanupEmptyRooms() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Find empty rooms that are older than 1 hour
      const emptyRooms = await GameRoom.find({
        $expr: { $eq: [{ $size: '$players' }, 0] },
        createdAt: { $lt: oneHourAgo }
      });

      if (emptyRooms.length > 0) {
        console.log(`Cleaning up ${emptyRooms.length} empty rooms`);
        
        for (const room of emptyRooms) {
          await GameRoom.findByIdAndDelete(room._id);
          console.log(`Deleted empty room ${room.roomCode}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up empty rooms:', error);
    }
  }
}

module.exports = SocketManager;
