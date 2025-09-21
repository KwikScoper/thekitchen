import React, { useState, useEffect } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

const VotingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2.5),
  fontFamily: '"Grandstander", cursive'
}))

const Title = styled(Typography)(({ theme }) => ({
  fontSize: '2.5rem',
  color: '#333',
  marginBottom: theme.spacing(2.5),
  textAlign: 'center',
  fontWeight: 'normal',
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))



const PlaceholderText = styled(Typography)(({ theme }) => ({
  color: '#999',
  fontSize: '1.2rem',
  textAlign: 'center',
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))

const PlayerListContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '600px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.spacing(2),
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
}))

const PlayerItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: '#f8f9fa',
  borderRadius: theme.spacing(1),
  border: '1px solid #e9ecef'
}))

const PlayerNameText = styled(Typography)(({ theme }) => ({
  fontSize: '1.2rem',
  color: '#333',
  fontWeight: 'bold',
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase',
  flex: 1
}))

const CustomRatingSelect = styled('select')(({ theme }) => ({
  minWidth: '80px',
  backgroundColor: 'white',
  borderRadius: theme.spacing(1),
  border: '1px solid #ddd',
  padding: theme.spacing(1),
  fontSize: '1rem',
  color: '#333',
  fontFamily: '"Grandstander", cursive',
  cursor: 'pointer',
  '&:hover': {
    border: '1px solid #999'
  },
  '&:focus': {
    border: '1px solid #4CAF50',
    outline: 'none'
  }
}))

const SubmitAllButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  backgroundColor: '#4CAF50',
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2, 4),
  fontSize: '1.1rem',
  fontWeight: 'bold',
  textTransform: 'lowercase',
  width: '100%',
  maxWidth: '300px',
  '&:hover': {
    backgroundColor: '#45a049'
  },
  '&:disabled': {
    backgroundColor: '#BDBDBD',
    color: '#757575'
  }
}))

const ProgressContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2)
}))

const ProgressBar = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '300px',
  height: '8px',
  backgroundColor: '#e0e0e0',
  borderRadius: theme.spacing(1),
  overflow: 'hidden'
}))

const ProgressFill = styled(Box)(({ theme }) => ({
  height: '100%',
  backgroundColor: '#4CAF50',
  transition: 'width 0.3s ease'
}))

const ProgressText = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  color: '#666',
  marginBottom: theme.spacing(1.25),
  textAlign: 'center',
  fontFamily: '"Comic Sans MS", cursive, sans-serif'
}))

const LeaveButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  position: 'absolute',
  top: theme.spacing(2.5),
  left: theme.spacing(2.5),
  backgroundColor: '#dda0dd',
  border: 'none',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1.25, 1.875),
  color: '#333',
  fontSize: '1rem',
  cursor: 'pointer',
  textTransform: 'lowercase',
  '&:hover': {
    backgroundColor: '#c8a2c8'
  }
}))



const VotingScreen = ({ 
  players = [], 
  currentPlayerId, 
  onVote, 
  onLeaveGame, 
  isLoading = false,
  hasVoted = false 
}) => {
  // Filter out the current player (only if currentPlayerId is valid)
  const otherPlayers = currentPlayerId 
    ? players.filter(player => {
        const isNotCurrentPlayer = player._id !== currentPlayerId
        return isNotCurrentPlayer
      })
    : players
  
  // Individual state for each player's rating
  const [playerRatings, setPlayerRatings] = useState({})
  
  // Calculate progress
  const ratedPlayers = Object.keys(playerRatings).filter(playerId => playerRatings[playerId] !== '').length
  const totalPlayers = otherPlayers.length
  const progressPercentage = totalPlayers > 0 ? (ratedPlayers / totalPlayers) * 100 : 0
  
  const handleRatingChange = (playerId, rating) => {
    if (hasVoted || isLoading) return
    
    // Safety check: prevent self-rating
    if (playerId === currentPlayerId) {
      console.warn('Attempted to rate self - this should not happen!', { playerId, currentPlayerId })
      return
    }
    
    setPlayerRatings(prev => {
      const newRatings = {
        ...prev,
        [playerId]: rating
      }
      return newRatings
    })
  }
  
  const handleSubmitAllVotes = () => {
    if (hasVoted || isLoading || ratedPlayers !== totalPlayers) return
    
    // Submit all votes
    Object.entries(playerRatings).forEach(([playerId, rating]) => {
      if (rating !== '' && playerId !== currentPlayerId) {
        onVote(playerId, rating)
      }
    })
  }
  
  const isAllRated = ratedPlayers === totalPlayers && totalPlayers > 0
  
  if (otherPlayers.length === 0) {
    return (
      <VotingContainer>
        <LeaveButton onClick={onLeaveGame}>
          ← leave game
        </LeaveButton>
        <Title variant="h1">rate each player!</Title>
        <PlayerListContainer>
          <PlaceholderText>No players to vote on</PlaceholderText>
        </PlayerListContainer>
      </VotingContainer>
    )
  }
  
  return (
    <VotingContainer>
      <LeaveButton onClick={onLeaveGame}>
        ← leave game
      </LeaveButton>
      
      <Title variant="h1">rate each player!</Title>
      
      <ProgressContainer>
        <ProgressText>
          {ratedPlayers} of {totalPlayers} players rated
        </ProgressText>
        <ProgressBar>
          <ProgressFill style={{ width: `${progressPercentage}%` }} />
        </ProgressBar>
      </ProgressContainer>
      
      <PlayerListContainer>
        {otherPlayers.map((player, index) => {
          const playerId = player._id
          const currentRating = playerRatings[playerId] || ''
          
          return (
            <PlayerItem key={`player-${playerId || index}`}>
              <PlayerNameText>
                {player.name}
              </PlayerNameText>
              <CustomRatingSelect
                value={currentRating}
                onChange={(e) => {
                  const newRating = parseInt(e.target.value)
                  if (!isNaN(newRating)) {
                    handleRatingChange(playerId, newRating)
                  }
                }}
                disabled={hasVoted || isLoading}
              >
                <option value="">rate</option>
                <option value={1}>1 ⭐</option>
                <option value={2}>2 ⭐⭐</option>
                <option value={3}>3 ⭐⭐⭐</option>
                <option value={4}>4 ⭐⭐⭐⭐</option>
                <option value={5}>5 ⭐⭐⭐⭐⭐</option>
              </CustomRatingSelect>
            </PlayerItem>
          )
        })}
      </PlayerListContainer>
      
      {isAllRated && !hasVoted && (
        <SubmitAllButton
          onClick={handleSubmitAllVotes}
          disabled={isLoading}
        >
          {isLoading ? 'submitting votes...' : 'submit all votes'}
        </SubmitAllButton>
      )}
      
      {hasVoted && (
        <Typography sx={{ 
          color: '#4CAF50', 
          fontSize: '1.2rem', 
          textAlign: 'center',
          fontFamily: '"Comic Sans MS", cursive, sans-serif'
        }}>
          ✓ All votes submitted! Waiting for other players...
        </Typography>
      )}
    </VotingContainer>
  )
}

export default VotingScreen
