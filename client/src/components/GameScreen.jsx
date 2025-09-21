import React, { useState, useRef, useEffect } from 'react'
import { Button, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'

// Styled components
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

const FinishedCookingButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  backgroundColor: '#2E7D32', // Dark green background
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2, 4),
  fontSize: '1rem',
  fontWeight: 'bold',
  textTransform: 'lowercase',
  width: '200px',
  '&:hover': {
    backgroundColor: '#1B5E20'
  }
}))

const TimerBox = styled(Paper)(({ theme }) => ({
  backgroundColor: 'white',
  borderRadius: theme.spacing(3), // More rounded corners
  padding: theme.spacing(4, 6), // Larger padding
  boxShadow: 'none', // No shadow
  minWidth: '300px', // Minimum width
  minHeight: '120px', // Minimum height
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const ChallengeBox = styled(Paper)(({ theme }) => ({
  backgroundColor: 'white',
  borderRadius: theme.spacing(3), // More rounded corners
  padding: theme.spacing(4, 6), // Larger padding
  boxShadow: 'none', // No shadow
  minWidth: '400px', // Minimum width
  minHeight: '100px', // Minimum height
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const LocationBox = styled(Paper)(({ theme }) => ({
  backgroundColor: '#F5F5F5', // Light gray background
  borderRadius: theme.spacing(2), // Slightly less rounded
  padding: theme.spacing(2, 4), // Smaller padding
  boxShadow: 'none', // No shadow
  minWidth: '300px', // Smaller minimum width
  minHeight: '60px', // Smaller minimum height
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: theme.spacing(2) // Space between challenge and location
}))

const GameScreen = ({ 
  currentPrompt, 
  timeRemaining, 
  players, 
  onLeaveGame,
  onFinishedCooking,
  timerLength = '30 mins',
  gameLocation = ''
}) => {
  const [timer, setTimer] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const timerIntervalRef = useRef(null)

  // Timer options mapping
  const timeOptions = {
    '30 mins': 30 * 60 * 1000,
    '1 hour': 60 * 60 * 1000,
    '2 hours': 2 * 60 * 60 * 1000,
    '3 hours': 3 * 60 * 60 * 1000
  }

  // Initialize timer when component mounts or timerLength changes
  useEffect(() => {
    console.log('GameScreen: timerLength received:', timerLength)
    const timerValue = timeOptions[timerLength] || 30 * 60 * 1000
    console.log('GameScreen: timer value set to:', timerValue, 'ms')
    
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    
    // Set timer and start countdown
    setTimer(timerValue)
    setIsTimerRunning(true)
    
    // Start countdown immediately
    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1000) {
          setIsTimerRunning(false)
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
          }
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [timerLength])


  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  return (
    <div className="min-h-screen bg-custom-green flex flex-col relative">
      {/* Leave Game Button */}
      <LeaveButton onClick={onLeaveGame}>
        ← leave game
      </LeaveButton>

      {/* Challenge and Location - Upper Half */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <ChallengeBox elevation={8}>
          <p className="text-black text-center" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase', fontSize: '1.5rem', fontWeight: 'bold'}}>
            challenge: {currentPrompt || 'yap yap yap'}
          </p>
        </ChallengeBox>
        
        {/* Location Box - Only show if location exists */}
        {gameLocation && (
          <LocationBox elevation={8}>
            <p className="text-gray-700 text-center" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase', fontSize: '1.2rem', fontWeight: 'normal'}}>
              location: {gameLocation}
            </p>
          </LocationBox>
        )}
      </div>

      {/* Timer Display - Lower Half */}
      <div className="flex-1 flex items-center justify-center">
        <TimerBox elevation={8}>
          <div className="text-black text-center" style={{fontFamily: '"Grandstander", cursive', fontSize: '4rem', fontWeight: 'bold', paddingTop: '0.5rem'}}>
            {formatTime(timer)}
          </div>
        </TimerBox>
      </div>

      {/* Finished Cooking Button */}
      <div className="flex justify-center items-center" style={{height: '300px'}}>
        <FinishedCookingButton onClick={onFinishedCooking}>
          finished cooking
        </FinishedCookingButton>
      </div>
    </div>
  )
}

export default GameScreen
