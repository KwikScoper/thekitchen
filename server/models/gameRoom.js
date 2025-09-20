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
gameRoomSchema.methods.addPlayer = function(playerId) {
  if (!this.players.includes(playerId)) {
    this.players.push(playerId);
  }
  return this.save();
};

// Method to remove a player from the room
gameRoomSchema.methods.removePlayer = function(playerId) {
  this.players = this.players.filter(id => !id.equals(playerId));
  return this.save();
};

module.exports = mongoose.model('GameRoom', gameRoomSchema);
