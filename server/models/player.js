const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  socketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  isHost: {
    type: Boolean,
    default: false
  },
  isConnected: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  disconnectTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes are defined in the schema above

module.exports = mongoose.model('Player', playerSchema);
