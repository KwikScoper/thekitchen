import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

// Styled components
const PodiumContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#FFFACD', // Light yellow/cream background matching the image
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  position: 'relative',
  fontFamily: '"Grandstander", cursive'
}))

const CongratulationsTitle = styled(Typography)(({ theme }) => ({
  fontSize: '3rem',
  color: 'black',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: theme.spacing(6),
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))

const PodiumWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  gap: theme.spacing(6),
  width: '100%',
  maxWidth: '800px',
  marginBottom: theme.spacing(4),
  position: 'relative'
}))

const PlayerPodium = styled(Box)(({ theme, rank }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  // Adjust positioning based on rank
  transform: rank === 1 ? 'translateY(-50px)' : 'none',
  transition: 'transform 0.3s ease'
}))

const PlayerName = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  color: 'black',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: theme.spacing(1),
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))

const PlayerRank = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  color: 'black',
  fontWeight: 'bold',
  textAlign: 'center',
  fontFamily: '"Grandstander", cursive'
}))

const LeaveButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  position: 'absolute',
  bottom: theme.spacing(3),
  left: theme.spacing(3),
  backgroundColor: '#9C27B0', // Purple background
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1, 2),
  fontSize: '0.875rem',
  textTransform: 'lowercase',
  '&:hover': {
    backgroundColor: '#7B1FA2'
  }
}))

const PodiumScreen = ({ 
  results = [], 
  onLeaveGame 
}) => {
  // Sort players by average rating (highest first)
  const sortedResults = [...results].sort((a, b) => b.averageRating - a.averageRating)
  
  // Get top 3 players
  const topPlayers = sortedResults.slice(0, 3)
  
  // If we have less than 3 players, pad with empty slots
  while (topPlayers.length < 3) {
    topPlayers.push({
      playerName: '',
      averageRating: 0,
      totalRating: 0,
      voteCount: 0
    })
  }

  return (
    <PodiumContainer>
      {/* Leave Game Button */}
      <LeaveButton onClick={onLeaveGame}>
        ← leave game
      </LeaveButton>

      {/* Congratulations Title */}
      <CongratulationsTitle>
        congratulations!
      </CongratulationsTitle>

      {/* Podium */}
      <PodiumWrapper>
        {/* 2nd Place (Left) */}
        <PlayerPodium rank={2}>
          {topPlayers[1] && topPlayers[1].playerName && (
            <>
              <PlayerName>{topPlayers[1].playerName}</PlayerName>
              <PlayerRank>2</PlayerRank>
            </>
          )}
        </PlayerPodium>

        {/* 1st Place (Center) */}
        <PlayerPodium rank={1}>
          {topPlayers[0] && topPlayers[0].playerName && (
            <>
              <PlayerName>{topPlayers[0].playerName}</PlayerName>
              <PlayerRank>1</PlayerRank>
            </>
          )}
        </PlayerPodium>

        {/* 3rd Place (Right) */}
        <PlayerPodium rank={3}>
          {topPlayers[2] && topPlayers[2].playerName && (
            <>
              <PlayerName>{topPlayers[2].playerName}</PlayerName>
              <PlayerRank>3</PlayerRank>
            </>
          )}
        </PlayerPodium>
      </PodiumWrapper>
    </PodiumContainer>
  )
}

export default PodiumScreen
