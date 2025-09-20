const mongoose = require('mongoose');

const gameRoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 4,
    index: true
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  gameState: {
    type: String,
    enum: ['lobby', 'submitting', 'voting', 'results'],
    default: 'lobby'
  },
  currentPrompt: {
    type: String,
    default: null
  },
  gameStartTime: {
    type: Date,
    default: null
  },
  cookingTimeLimit: {
    type: Number,
    default: 1800, // 30 minutes in seconds
    min: 300, // Minimum 5 minutes
    max: 7200 // Maximum 2 hours
  },
  votingTimeLimit: {
    type: Number,
    default: 300, // 5 minutes in seconds
    min: 60, // Minimum 1 minute
    max: 1800 // Maximum 30 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Auto-delete after 1 hour
    index: true
  }
}, {
  timestamps: true
});

// Indexes are defined in the schema above

// Virtual for player count
gameRoomSchema.virtual('playerCount').get(function() {
  return this.players.length;
});

// Method to add a player to the room
gameRoomSchema.methods.addPlayer = async function(playerId) {
  if (!this.players.includes(playerId)) {
    this.players.push(playerId);
  }
  return await this.save();
};

// Method to remove a player from the room
gameRoomSchema.methods.removePlayer = async function(playerId) {
  this.players = this.players.filter(id => !id.equals(playerId));
  try {
    return await this.save();
  } catch (error) {
    if (error.name === 'VersionError') {
      // Handle concurrent modification by refetching and retrying
      const freshRoom = await this.constructor.findById(this._id);
      if (freshRoom) {
        freshRoom.players = freshRoom.players.filter(id => !id.equals(playerId));
        return await freshRoom.save();
      }
    }
    throw error;
  }
};

// Method to start the game
gameRoomSchema.methods.startGame = async function(prompt) {
  if (this.gameState !== 'lobby') {
    throw new Error('Game can only be started from lobby state');
  }
  
  if (this.players.length < 2) {
    throw new Error('At least 2 players required to start game');
  }
  
  this.gameState = 'submitting';
  this.currentPrompt = prompt;
  this.gameStartTime = new Date();
  
  return await this.save();
};

// Method to transition to voting phase
gameRoomSchema.methods.startVoting = async function() {
  if (this.gameState !== 'submitting') {
    throw new Error('Can only start voting from submitting state');
  }
  
  this.gameState = 'voting';
  
  return await this.save();
};

// Method to transition to results phase
gameRoomSchema.methods.showResults = async function() {
  if (this.gameState !== 'voting') {
    throw new Error('Can only show results from voting state');
  }
  
  this.gameState = 'results';
  
  return await this.save();
};

// Method to end voting phase (alias for showResults)
gameRoomSchema.methods.endVoting = async function() {
  return await this.showResults();
};

// Method to reset game to lobby
gameRoomSchema.methods.resetToLobby = async function() {
  this.gameState = 'lobby';
  this.currentPrompt = null;
  this.gameStartTime = null;
  
  return await this.save();
};

// Method to check if cooking time has expired
gameRoomSchema.methods.isCookingTimeExpired = function() {
  if (!this.gameStartTime || this.gameState !== 'submitting') {
    return false;
  }
  
  const elapsed = (new Date() - this.gameStartTime) / 1000; // Convert to seconds
  return elapsed >= this.cookingTimeLimit;
};

// Method to get remaining cooking time
gameRoomSchema.methods.getRemainingCookingTime = function() {
  if (!this.gameStartTime || this.gameState !== 'submitting') {
    return 0;
  }
  
  const elapsed = (new Date() - this.gameStartTime) / 1000; // Convert to seconds
  const remaining = this.cookingTimeLimit - elapsed;
  return Math.max(0, Math.floor(remaining));
};

// Method to check if voting time has expired
gameRoomSchema.methods.isVotingTimeExpired = function() {
  if (this.gameState !== 'voting') {
    return false;
  }
  
  // For now, voting doesn't have a time limit, but we can add it later
  return false;
};

// Method to get remaining voting time
gameRoomSchema.methods.getRemainingVotingTime = function() {
  if (this.gameState !== 'voting') {
    return 0;
  }
  
  // For now, return a large number since voting doesn't have a time limit
  return 999999;
};

module.exports = mongoose.model('GameRoom', gameRoomSchema);
