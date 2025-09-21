import React, { useState, useEffect } from 'react'
import { Box, Button, Typography, TextField, Alert } from '@mui/material'
import { styled } from '@mui/material/styles'

// Styled components
const HomeContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#DBF0C5', // Light green background
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  position: 'relative'
}))

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(4),
  width: '100%',
  maxWidth: 300
}))

const InputLabel = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1rem',
  fontWeight: 'bold',
  color: 'black',
  textAlign: 'left',
  width: '100%',
  textTransform: 'lowercase'
}))

const StyledTextField = styled(TextField)(({ theme }) => ({
  width: '100%',
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    '& fieldset': {
      border: 'none',
      borderBottom: '1px solid #D3D3D3'
    },
    '&:hover fieldset': {
      borderBottom: '1px solid #999'
    },
    '&.Mui-focused fieldset': {
      borderBottom: '1px solid #000'
    }
  },
  '& .MuiInputBase-input': {
    fontFamily: '"Grandstander", cursive',
    padding: theme.spacing(1, 0),
    fontSize: '1rem',
    textTransform: 'lowercase'
  }
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

const SubmitButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  backgroundColor: '#424242',
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1.5, 3),
  fontSize: '1rem',
  textTransform: 'lowercase',
  marginTop: theme.spacing(2),
  '&:hover': {
    backgroundColor: '#303030'
  },
  '&:disabled': {
    backgroundColor: '#BDBDBD',
    color: 'white'
  }
}))

const CornerImage = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(3),
  width: '300px',
  height: '300px',
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  opacity: 0.8,
  zIndex: 1
}))

const TopLeftImage = styled(CornerImage)(({ theme }) => ({
  left: theme.spacing(3),
  backgroundImage: 'url(https://i.postimg.cc/MZmCPmxm/Kebab.png)'
}))

const TopRightImage = styled(CornerImage)(({ theme }) => ({
  right: theme.spacing(3),
  backgroundImage: 'url(https://i.postimg.cc/NF8Bb3D6/Samosa.png)'
}))

const HomePage = ({ socket, isConnected, onRoomJoined, onRoomCreated, onBackToLanding }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  
  // View state - 'create' or 'join'
  const [currentView, setCurrentView] = useState('join') // Default to join view

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return

    // Room creation events
    socket.on('roomCreated', (data) => {
      console.log('Room created:', data)
      setSuccess(`Room created successfully! Room code: ${data.data.roomCode}`)
      setIsLoading(false)
      
      // Call parent callback with room data
      if (onRoomCreated) {
        onRoomCreated(data.data)
      }
    })

    // Room joining events
    socket.on('roomJoined', (data) => {
      console.log('Room joined:', data)
      setSuccess(`Successfully joined room ${data.data.roomCode}!`)
      setIsLoading(false)
      
      // Call parent callback with room data
      if (onRoomJoined) {
        onRoomJoined(data.data)
      }
    })

    // Error handling
    socket.on('error', (errorData) => {
      console.error('Socket error:', errorData)
      setError(errorData.message || 'An error occurred')
      setIsLoading(false)
    })

    // Clean up event listeners when component unmounts
    return () => {
      socket.off('roomCreated')
      socket.off('roomJoined')
      socket.off('error')
    }
  }, [socket, onRoomCreated, onRoomJoined])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    if (playerName.trim().length > 50) {
      setError('Name must be 50 characters or less')
      return
    }

    // Validate player name contains only allowed characters
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/
    if (!nameRegex.test(playerName.trim())) {
      setError('Name can only contain letters, numbers, spaces, hyphens, and underscores')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      socket.emit('createRoom', {
        playerName: playerName.trim()
      })
    } catch (err) {
      console.error('Error creating room:', err)
      setError('Failed to create room. Please try again.')
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (e) => {
    e.preventDefault()
    
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code')
      return
    }

    if (roomCode.trim().length !== 4) {
      setError('Room code must be exactly 4 characters')
      return
    }

    if (playerName.trim().length > 50) {
      setError('Name must be 50 characters or less')
      return
    }

    // Validate player name contains only allowed characters
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/
    if (!nameRegex.test(playerName.trim())) {
      setError('Name can only contain letters, numbers, spaces, hyphens, and underscores')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      socket.emit('joinRoom', {
        roomCode: roomCode.trim().toUpperCase(),
        playerName: playerName.trim()
      })
    } catch (err) {
      console.error('Error joining room:', err)
      setError('Failed to join room. Please try again.')
      setIsLoading(false)
    }
  }

  const handleLeaveGame = () => {
    if (onBackToLanding) {
      onBackToLanding()
    }
  }

  const toggleView = () => {
    setCurrentView(currentView === 'join' ? 'create' : 'join')
    setError('')
    setSuccess('')
    setPlayerName('')
    setRoomCode('')
  }

  return (
    <HomeContainer>
      {/* Corner Images */}
      <TopLeftImage />
      <TopRightImage />
      
      {/* Leave Game Button */}
      <LeaveButton onClick={handleLeaveGame}>
        ← leave game
      </LeaveButton>

      {/* Main Content */}
      <InputContainer>
        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={currentView === 'join' ? handleJoinRoom : handleCreateRoom} sx={{ width: '100%' }}>
          {/* Game Code Input (only for join view) */}
          {currentView === 'join' && (
            <Box sx={{ mb: 3 }}>
              <InputLabel>game code</InputLabel>
              <StyledTextField
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Code"
                fullWidth
                disabled={isLoading}
                inputProps={{ maxLength: 4 }}
              />
            </Box>
          )}

          {/* Player Name Input */}
          <Box sx={{ mb: 3 }}>
            <InputLabel>player name</InputLabel>
            <StyledTextField
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Name"
              fullWidth
              disabled={isLoading}
              inputProps={{ maxLength: 50 }}
            />
          </Box>

          {/* Submit Button */}
          <SubmitButton
            type="submit"
            disabled={isLoading || !playerName.trim() || (currentView === 'join' && !roomCode.trim())}
            fullWidth
          >
            {isLoading ? 'loading...' : (currentView === 'join' ? 'join game' : 'create game')}
          </SubmitButton>
        </Box>

        {/* Toggle Button */}
        <Button
          onClick={toggleView}
          sx={{
            fontFamily: '"Grandstander", cursive',
            color: '#666',
            textTransform: 'lowercase',
            fontSize: '0.875rem',
            mt: 2
          }}
        >
          {currentView === 'join' ? 'create a game instead' : 'join a game instead'}
        </Button>
      </InputContainer>
    </HomeContainer>
  )
}

export default HomePage