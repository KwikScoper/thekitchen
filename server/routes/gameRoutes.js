const express = require('express');
const router = express.Router();
const GameRoom = require('../models/gameRoom');
const Player = require('../models/player');

// Generate a unique 4-letter room code
const generateRoomCode = async () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let roomCode;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate 4 random letters
    roomCode = '';
    for (let i = 0; i < 4; i++) {
      roomCode += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Check if this room code already exists
    const existingRoom = await GameRoom.findOne({ roomCode });
    if (!existingRoom) {
      isUnique = true;
    }
  }
  
  return roomCode;
};

// POST /api/room/create - Create a new game room
router.post('/create', async (req, res) => {
  try {
    const { playerName, socketId } = req.body;
    
    // Validate required fields
    if (!playerName || !socketId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both playerName and socketId are required'
      });
    }
    
    // Validate player name
    if (typeof playerName !== 'string' || playerName.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid player name',
        message: 'Player name must be a non-empty string'
      });
    }
    
    if (playerName.trim().length > 50) {
      return res.status(400).json({
        error: 'Invalid player name',
        message: 'Player name must be 50 characters or less'
      });
    }
    
    // Validate socket ID
    if (typeof socketId !== 'string' || socketId.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid socket ID',
        message: 'Socket ID must be a non-empty string'
      });
    }
    
    // Check if player with this socket ID already exists
    const existingPlayer = await Player.findOne({ socketId });
    if (existingPlayer) {
      return res.status(409).json({
        error: 'Player already exists',
        message: 'A player with this socket ID already exists'
      });
    }
    
    // Generate unique room code
    const roomCode = await generateRoomCode();
    
    // Create the host player
    const hostPlayer = new Player({
      socketId: socketId.trim(),
      name: playerName.trim(),
      isHost: true
    });
    
    // Save the host player
    await hostPlayer.save();
    
    // Create the game room
    const gameRoom = new GameRoom({
      roomCode,
      players: [hostPlayer._id],
      gameState: 'lobby'
    });
    
    // Save the game room
    await gameRoom.save();
    
    // Populate the players field for response
    await gameRoom.populate('players');
    
    // Return success response
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        roomCode: gameRoom.roomCode,
        gameState: gameRoom.gameState,
        playerCount: gameRoom.playerCount,
        players: gameRoom.players.map(player => ({
          id: player._id,
          name: player.name,
          isHost: player.isHost,
          socketId: player.socketId
        })),
        createdAt: gameRoom.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating room:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'A room or player with this information already exists'
      });
    }
    
    // Generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create room. Please try again.'
    });
  }
});

// GET /api/room/:roomCode - Get room information
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    // Validate room code format
    if (!roomCode || typeof roomCode !== 'string' || roomCode.length !== 4) {
      return res.status(400).json({
        error: 'Invalid room code',
        message: 'Room code must be exactly 4 characters'
      });
    }
    
    // Find the room
    const gameRoom = await GameRoom.findOne({ 
      roomCode: roomCode.toUpperCase() 
    }).populate('players');
    
    if (!gameRoom) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'No room exists with this code'
      });
    }
    
    // Return room information
    res.json({
      success: true,
      data: {
        roomCode: gameRoom.roomCode,
        gameState: gameRoom.gameState,
        playerCount: gameRoom.playerCount,
        players: gameRoom.players.map(player => ({
          id: player._id,
          name: player.name,
          isHost: player.isHost,
          socketId: player.socketId
        })),
        currentPrompt: gameRoom.currentPrompt,
        createdAt: gameRoom.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch room information'
    });
  }
});

// DELETE /api/room/:roomCode - Delete a room (for cleanup)
router.delete('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    // Validate room code format
    if (!roomCode || typeof roomCode !== 'string' || roomCode.length !== 4) {
      return res.status(400).json({
        error: 'Invalid room code',
        message: 'Room code must be exactly 4 characters'
      });
    }
    
    // Find and delete the room
    const gameRoom = await GameRoom.findOneAndDelete({ 
      roomCode: roomCode.toUpperCase() 
    });
    
    if (!gameRoom) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'No room exists with this code'
      });
    }
    
    // Also delete all players in this room
    await Player.deleteMany({ _id: { $in: gameRoom.players } });
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete room'
    });
  }
});

module.exports = router;
