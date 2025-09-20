const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameRoom',
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  votes: [{
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player'
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes are defined in the schema above

// Virtual for vote count
submissionSchema.virtual('voteCount').get(function() {
  return this.votes.length;
});

// Method to add a vote
submissionSchema.methods.addVote = function(voterId) {
  // Check if voter has already voted
  const existingVote = this.votes.find(vote => vote.voterId.equals(voterId));
  if (existingVote) {
    throw new Error('Player has already voted for this submission');
  }
  
  // Check if voter is trying to vote for their own submission
  // Handle both populated and non-populated playerId
  const submissionPlayerId = this.playerId._id || this.playerId;
  if (voterId.equals(submissionPlayerId)) {
    throw new Error('Players cannot vote for their own submission');
  }
  
  this.votes.push({ voterId });
  return this.save();
};

// Method to remove a vote
submissionSchema.methods.removeVote = function(voterId) {
  this.votes = this.votes.filter(vote => !vote.voterId.equals(voterId));
  return this.save();
};

// Static method to get submissions for a room
submissionSchema.statics.getByRoom = function(roomId) {
  return this.find({ roomId }).populate('playerId', 'name').populate('votes.voterId', 'name');
};

module.exports = mongoose.model('Submission', submissionSchema);
