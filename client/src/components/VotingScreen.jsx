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

const ImageContainer = styled(Box)(({ theme }) => ({
  width: '80%',
  maxWidth: '500px',
  height: '400px',
  backgroundColor: '#f0f0f0',
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(2.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
}))

const SubmissionImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '15px'
})

const PlaceholderText = styled(Typography)(({ theme }) => ({
  color: '#999',
  fontSize: '1.2rem',
  textAlign: 'center',
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))

const StarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.25),
  marginBottom: theme.spacing(2.5)
}))

const StarButton = styled(Button)(({ theme }) => ({
  background: 'none',
  border: 'none',
  fontSize: '2.5rem',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  minWidth: 'auto',
  padding: theme.spacing(0.5),
  '&:hover': {
    transform: 'scale(1.1)',
    backgroundColor: 'transparent'
  },
  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.5
  }
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

const PlayerName = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  color: '#333',
  marginBottom: theme.spacing(1.25),
  textAlign: 'center',
  fontWeight: 'bold',
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))

const ProgressText = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  color: '#666',
  marginBottom: theme.spacing(1.25),
  textAlign: 'center',
  fontFamily: '"Comic Sans MS", cursive, sans-serif'
}))

const VotingScreen = ({ 
  players = [], 
  currentPlayerId, 
  onVote, 
  onLeaveGame, 
  isLoading = false,
  hasVoted = false 
}) => {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [selectedRating, setSelectedRating] = useState(0)
  
  // Filter out the current player
  const otherPlayers = players.filter(player => 
    player._id !== currentPlayerId
  )
  
  const currentPlayer = otherPlayers[currentPlayerIndex]
  
  useEffect(() => {
    // Reset rating when switching to next player
    setSelectedRating(0)
  }, [currentPlayerIndex])
  
  const handleStarClick = (rating) => {
    if (hasVoted || isLoading) return
    setSelectedRating(rating)
  }
  
  const handleVote = () => {
    if (!currentPlayer || selectedRating === 0 || hasVoted || isLoading) return
    
    onVote(currentPlayer._id, selectedRating)
  }
  
  const handleNext = () => {
    if (currentPlayerIndex < otherPlayers.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1)
    }
  }
  
  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <StarButton
        key={star}
        onClick={() => handleStarClick(star)}
        disabled={hasVoted || isLoading}
        style={{
          color: star <= selectedRating ? '#ffd700' : '#ddd'
        }}
      >
        ★
      </StarButton>
    ))
  }
  
  if (otherPlayers.length === 0) {
    return (
      <VotingContainer>
        <LeaveButton onClick={onLeaveGame}>
          ← leave game
        </LeaveButton>
        <Title variant="h1">rate each player!</Title>
        <ImageContainer>
          <PlaceholderText>No players to vote on</PlaceholderText>
        </ImageContainer>
      </VotingContainer>
    )
  }
  
  return (
    <VotingContainer>
      <LeaveButton onClick={onLeaveGame}>
        ← leave game
      </LeaveButton>
      
      <Title variant="h1">rate each player!</Title>
      
      <PlayerName>
        {currentPlayer?.name || 'Unknown Player'}
      </PlayerName>
      
      <ImageContainer>
        <PlaceholderText>rate this player's cooking!</PlaceholderText>
      </ImageContainer>
      
      <StarContainer>
        {renderStars()}
      </StarContainer>
      
      <ProgressText>
        {currentPlayerIndex + 1} of {otherPlayers.length} players
      </ProgressText>
      
      {selectedRating > 0 && !hasVoted && (
        <Button
          onClick={handleVote}
          disabled={isLoading}
          variant="contained"
          sx={{
            background: '#4CAF50',
            color: 'white',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '1.1rem',
            fontFamily: '"Grandstander", cursive',
            textTransform: 'lowercase',
            '&:hover': {
              backgroundColor: '#45a049'
            }
          }}
        >
          {isLoading ? 'voting...' : 'submit vote'}
        </Button>
      )}
      
      {hasVoted && (
        <Typography sx={{ 
          color: '#4CAF50', 
          fontSize: '1.2rem', 
          textAlign: 'center',
          fontFamily: '"Comic Sans MS", cursive, sans-serif'
        }}>
          ✓ Vote submitted! Waiting for other players...
        </Typography>
      )}
    </VotingContainer>
  )
}

export default VotingScreen
