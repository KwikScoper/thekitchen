import React, { useState, useEffect } from 'react'
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { styled } from '@mui/material/styles'
import GameScreen from '../components/GameScreen'
import VotingScreen from '../components/VotingScreen'

// Styled components
const RoomContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#DBF0C5', // Light green background
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  position: 'relative'
}))

const ContentContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: 400,
  gap: theme.spacing(4)
}))

const GameCodeSection = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  width: '100%'
}))

const GameCodeLabel = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1rem',
  fontWeight: 'normal',
  color: 'black',
  marginBottom: theme.spacing(1),
  textTransform: 'lowercase'
}))

const GameCodeValue = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1.5rem',
  fontWeight: 'normal',
  color: '#666',
  borderBottom: '1px solid #D3D3D3',
  paddingBottom: theme.spacing(0.5),
  display: 'inline-block',
  minWidth: '100px',
  textTransform: 'lowercase'
}))

const PlayersLabel = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1rem',
  fontWeight: 'normal',
  color: 'black',
  textAlign: 'center',
  width: '100%',
  textTransform: 'lowercase'
}))

const PlayerSlot = styled(Box)(({ theme }) => ({
  backgroundColor: '#F8F0F8', // Light pink/purple background
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  width: '100%',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  border: '1px solid rgba(0,0,0,0.05)'
}))

const PlayerText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1rem',
  color: 'black',
  fontWeight: 'normal',
  textTransform: 'lowercase'
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

const StartGameButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  backgroundColor: '#F44336', // Red background
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2, 4),
  fontSize: '1rem',
  fontWeight: 'bold',
  textTransform: 'lowercase',
  width: '100%',
  '&:hover': {
    backgroundColor: '#D32F2F'
  },
  '&:disabled': {
    backgroundColor: '#BDBDBD',
    color: '#757575'
  }
}))

const HostSetupContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#DBF0C5', // Light green background
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  position: 'relative'
}))

const SetupTitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '2rem',
  fontWeight: 'bold',
  color: '#424242', // Dark gray text
  textAlign: 'center',
  textTransform: 'lowercase'
}))

const HostLeaveButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  position: 'absolute',
  bottom: theme.spacing(3),
  left: theme.spacing(3),
  backgroundColor: '#9C27B0', // Purple background
  color: '#424242', // Dark gray text
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1, 2),
  fontSize: '0.875rem',
  textTransform: 'lowercase',
  '&:hover': {
    backgroundColor: '#7B1FA2'
  }
}))

const DropdownContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: 300
}))

const DropdownLabel = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1rem',
  fontWeight: 'normal',
  color: 'black',
  textAlign: 'left',
  width: '100%',
  textTransform: 'lowercase'
}))

const StyledSelect = styled(Select)(({ theme }) => ({
  width: '100%',
  backgroundColor: '#F8F0F8', // Light pink/purple background
  borderRadius: theme.spacing(1),
  '& .MuiOutlinedInput-notchedOutline': {
    border: '1px solid rgba(0,0,0,0.1)'
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    border: '1px solid rgba(0,0,0,0.2)'
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    border: '1px solid rgba(0,0,0,0.3)'
  },
  '& .MuiSelect-select': {
    padding: theme.spacing(1.5, 2),
    fontSize: '1rem',
    color: 'black'
  }
}))

const WaitingContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#DBF0C5', // Light mint green background
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  position: 'relative'
}))

const WaitingText = styled(Typography)(({ theme }) => ({
  fontSize: '3rem',
  fontWeight: 'bold',
  color: 'black',
  textAlign: 'center',
  fontFamily: '"Grandstander", cursive',
  textTransform: 'lowercase'
}))

const WaitingLeaveButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  position: 'absolute',
  bottom: theme.spacing(3),
  left: theme.spacing(3),
  backgroundColor: '#9C27B0', // Light purple background
  color: 'black', // Black text
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1, 2),
  fontSize: '0.875rem',
  textTransform: 'lowercase',
  '&:hover': {
    backgroundColor: '#7B1FA2'
  }
}))

const ContinueButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  backgroundColor: '#F44336', // Red background
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2, 4),
  fontSize: '1rem',
  fontWeight: 'bold',
  textTransform: 'lowercase',
  width: '100%',
  marginTop: theme.spacing(2),
  '&:hover': {
    backgroundColor: '#D32F2F'
  }
}))

const GlobeSpinningContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: '#DBF0C5', // Light mint green background
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  position: 'relative'
}))

const GlobeSpinningText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '2rem',
  fontWeight: 'normal',
  color: 'black',
  textAlign: 'center',
  marginBottom: theme.spacing(8),
  textTransform: 'lowercase'
}))

const ChallengeText = styled(Typography)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  fontSize: '1.5rem',
  fontWeight: 'normal',
  color: 'black',
  textAlign: 'center',
  position: 'absolute',
  bottom: theme.spacing(8),
  textTransform: 'lowercase'
}))

const GlobeLeaveButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  position: 'absolute',
  bottom: theme.spacing(3),
  left: theme.spacing(3),
  backgroundColor: '#9C27B0', // Light purple background
  color: 'white', // White text
  borderRadius: theme.spacing(1),
  padding: theme.spacing(1, 2),
  fontSize: '0.875rem',
  textTransform: 'lowercase',
  '&:hover': {
    backgroundColor: '#7B1FA2'
  }
}))

const GlobeNextButton = styled(Button)(({ theme }) => ({
  fontFamily: '"Grandstander", cursive',
  backgroundColor: '#F44336', // Red background
  color: 'white',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2, 4),
  fontSize: '1rem',
  fontWeight: 'bold',
  textTransform: 'lowercase',
  width: '200px',
  marginTop: theme.spacing(4),
  '&:hover': {
    backgroundColor: '#D32F2F'
  },
  '&:disabled': {
    backgroundColor: '#BDBDBD',
    color: '#757575'
  }
}))

const RoomPage = ({ socket, isConnected, roomData, onBackToHome }) => {
  const [currentRoom, setCurrentRoom] = useState(roomData)
  const [gameState, setGameState] = useState(roomData?.gameState || 'lobby')
  const [players, setPlayers] = useState(roomData?.players || [])
  const [currentPrompt, setCurrentPrompt] = useState(roomData?.currentPrompt || '')
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Game timing states
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [gameStartTime, setGameStartTime] = useState(null)
  const [votingStartTime, setVotingStartTime] = useState(null)
  
  // Voting states
  const [votes, setVotes] = useState({})
  const [hasVoted, setHasVoted] = useState(false)
  const [votingProgress, setVotingProgress] = useState({})
  
  // Results states
  const [results, setResults] = useState(null)
  const [winner, setWinner] = useState(null)

  // Game setup states
  const [category, setCategory] = useState('Hemisphere')
  const [difficulty, setDifficulty] = useState('Easy')
  const [timerLength, setTimerLength] = useState('30 mins')
  const [selectedLocation, setSelectedLocation] = useState(null)

  // Fallback location lists for client-side selection if server fails
  const FALLBACK_LOCATIONS = {
    Hemisphere: ['Northern Hemisphere', 'Southern Hemisphere', 'Eastern Hemisphere', 'Western Hemisphere'],
    Continent: ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'],
    Region: ['Mediterranean', 'Scandinavia', 'Caribbean', 'Middle East', 'Southeast Asia', 'Central America', 'Balkans', 'Himalayas', 'Amazon Basin', 'Sahara Desert', 'Arctic Circle', 'Pacific Islands', 'Great Plains', 'Andes Mountains', 'Siberia'],
    Country: ['Italy', 'Japan', 'Mexico', 'India', 'France', 'Thailand', 'Spain', 'Brazil', 'Greece', 'Morocco', 'Turkey', 'Peru', 'Vietnam', 'Ethiopia', 'Lebanon', 'South Korea', 'Argentina', 'Portugal', 'Nigeria', 'Poland', 'Egypt', 'Indonesia', 'Germany', 'Colombia', 'Malaysia', 'Russia', 'Kenya', 'Iran', 'Philippines', 'Chile', 'Hungary', 'Ghana', 'Romania', 'Ukraine', 'Tunisia']
  }

  // Function to get fallback location
  const getFallbackLocation = (cat) => {
    const locations = FALLBACK_LOCATIONS[cat] || FALLBACK_LOCATIONS.Hemisphere
    return locations[Math.floor(Math.random() * locations.length)]
  }


  // Debug timer length changes
  useEffect(() => {
    console.log('RoomPage: timerLength state changed to:', timerLength)
  }, [timerLength])


  // Set up socket event listeners and join room
  useEffect(() => {
    if (!socket || !roomData) return

    console.log('RoomPage: Setting up socket listeners for room:', roomData.roomCode)

    // Room management events
    socket.on('roomUpdate', (data) => {
      console.log('RoomPage: Room update received:', data)
      setCurrentRoom(data.data)
      setPlayers(data.data?.players || [])
      setGameState(data.data?.gameState || 'lobby')
      setCurrentPrompt(data.data?.currentPrompt || '')
      
      // Update host status
      const currentPlayer = data.data?.players?.find(p => p.socketId === socket.id)
      setIsHost(currentPlayer?.isHost || false)
    })

    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data)
      setSuccess(`${data.playerName} joined the room`)
    })

    socket.on('playerLeft', (data) => {
      console.log('Player left:', data)
      setSuccess(`${data.playerName} left the room`)
    })

    socket.on('playerReconnected', (data) => {
      console.log('Player reconnected:', data)
      setSuccess(`${data.data?.playerName || 'A player'} is back from cooking`)
      if (data.data?.players) {
        setPlayers(data.data.players)
      }
    })

    socket.on('playerDisconnected', (data) => {
      console.log('Player disconnected:', data)
      setSuccess(`${data.data?.playerName || 'A player'} is cooking`)
      if (data.data?.players) {
        setPlayers(data.data.players)
      }
    })

    // Game management events
    socket.on('gameStarted', (data) => {
      console.log('Game started:', data)
      setGameState('hostSetup') // Set to hostSetup instead of submitting
      setCurrentPrompt(data.data?.currentPrompt || '')
      setGameStartTime(new Date())
      setSuccess('Game setup started!')
      setIsLoading(false)
    })

    socket.on('gameContinued', (data) => {
      console.log('=== GAME CONTINUED EVENT HANDLER CALLED ===')
      console.log('RoomPage: gameContinued received:', data)
      console.log('RoomPage: Full data object:', JSON.stringify(data, null, 2))
      console.log('RoomPage: timerLength from server:', data.data?.timerLength)
      console.log('RoomPage: current timerLength state:', timerLength)
      console.log('RoomPage: isHost:', isHost)
      
      // Update timer length for non-host players
      if (data.data?.timerLength && !isHost) {
        console.log('RoomPage: Updating timerLength for non-host player:', data.data.timerLength)
        setTimerLength(data.data.timerLength)
        console.log('RoomPage: setTimerLength called with:', data.data.timerLength)
      } else {
        console.log('RoomPage: Not updating timerLength - isHost:', isHost, 'serverTimerLength:', data.data?.timerLength)
      }
      
      setGameState('submitting') // Now transition to actual game
      setCurrentPrompt(data.data?.currentPrompt || '')
      
      // Update category and selected location from server
      if (data.data?.category) {
        console.log('RoomPage: Setting category from server:', data.data.category)
        setCategory(data.data.category)
      }
      if (data.data?.selectedLocation) {
        console.log('RoomPage: Setting selectedLocation from server:', data.data.selectedLocation)
        setSelectedLocation(data.data.selectedLocation)
      } else {
        console.log('RoomPage: No selectedLocation in server data!')
        console.log('RoomPage: Available keys in data.data:', Object.keys(data.data || {}))
      }
      setGameStartTime(new Date())
      setSuccess('Game started! Check your cooking prompt below.')
      setIsLoading(false)
    })

    socket.on('nextToGame', (data) => {
      console.log('Next to game:', data)
      console.log('RoomPage: selectedLocation before nextToGame:', selectedLocation)
      console.log('RoomPage: category before nextToGame:', category)
      setGameState('gameScreen')
      setSuccess('Game screen activated!')
      setIsLoading(false)
    })


    socket.on('votingStarted', (data) => {
      console.log('Voting started:', data)
      setGameState('voting')
      setVotingStartTime(new Date())
      setSuccess('Voting has started! Vote for your favorite dish.')
    })

    socket.on('voteSuccess', (data) => {
      console.log('Vote successful:', data)
      setHasVoted(true)
      setSuccess('Vote cast successfully!')
      setIsLoading(false)
    })

    socket.on('voteUpdate', (data) => {
      console.log('Vote update:', data)
      setVotes(data.votes || {})
      setVotingProgress(data.progress || {})
      
      if (data.data?.allPlayersVoted) {
        setSuccess('All players have voted! Results coming soon.')
      }
    })

    socket.on('resultsReady', (data) => {
      console.log('Results ready:', data)
      setGameState('results')
      setResults(data.data?.results || [])
      setWinner(data.data?.winner || null)
      setSuccess('Results are in! Check out the winner below.')
    })

    // Error handling
    socket.on('error', (errorData) => {
      console.error('Socket error:', errorData)
      setError(errorData.message || 'An error occurred')
      setIsLoading(false)
    })

    // Handle room joined event (for reconnections)
    socket.on('roomJoined', (data) => {
      console.log('RoomPage: Room joined event received:', data)
      if (data.success && data.data) {
        setCurrentRoom(data.data)
        setPlayers(data.data?.players || [])
        setGameState(data.data?.gameState || 'lobby')
        setCurrentPrompt(data.data?.currentPrompt || '')
        
        // Update submission status from server
        if (data.data.hasSubmitted !== undefined) {
          console.log('RoomPage: Server says hasSubmitted:', data.data.hasSubmitted)
          setHasSubmitted(data.data.hasSubmitted)
          console.log('RoomPage: Set hasSubmitted from server:', data.data.hasSubmitted)
        } else {
          console.log('RoomPage: Server did not provide hasSubmitted status')
        }
        
        // Update host status
        const currentPlayer = data.data?.players?.find(p => p.socketId === socket.id)
        setIsHost(currentPlayer?.isHost || false)
      }
    })

    // Clean up event listeners when component unmounts
    return () => {
      socket.off('roomUpdate')
      socket.off('roomJoined')
      socket.off('playerJoined')
      socket.off('playerLeft')
      socket.off('playerReconnected')
      socket.off('playerDisconnected')
      socket.off('gameStarted')
      socket.off('gameContinued')
      socket.off('nextToGame')
      socket.off('votingStarted')
      socket.off('voteSuccess')
      socket.off('voteUpdate')
      socket.off('resultsReady')
      socket.off('error')
    }
  }, [socket, roomData, isConnected])

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

  // Game action handlers
  const handleStartGame = () => {
    if (!socket || !isConnected || !isHost) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    // Emit startGame event to notify all players
    socket.emit('startGame', {
      roomCode: currentRoom.roomCode,
      gameState: 'hostSetup'
    })
  }

  const handleLeaveRoom = () => {
    if (!socket || !isConnected) return
    
    
    socket.emit('leaveRoom', {
      roomCode: currentRoom.roomCode
    })
    
    // Navigate back to home
    if (onBackToHome) {
      onBackToHome()
    }
  }

  const handleContinue = () => {
    if (!socket || !isConnected || !isHost) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    console.log('RoomPage: handleContinue - timerLength selected:', timerLength)
    
    const emitData = {
      roomCode: currentRoom.roomCode,
      category: category,
      difficulty: difficulty,
      timerLength: timerLength
    }
    
    console.log('RoomPage: Emitting continueGame with data:', emitData)
    console.log('RoomPage: timerLength being sent:', timerLength)
    
    // Emit continueGame event to proceed to actual game start
    socket.emit('continueGame', emitData)
  }

  const handleNextToGame = () => {
    if (!socket || !isConnected || !isHost) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    // Emit event to notify all players to transition to game screen
    socket.emit('nextToGame', {
      roomCode: currentRoom.roomCode
    })
  }

  const handleFinishedCooking = () => {
    // Move directly to voting phase
    if (!socket || !isConnected) return
    
    socket.emit('startVoting', {
      roomCode: currentRoom.roomCode
    })
  }

  const handleVote = (playerId, rating) => {
    if (!socket || !isConnected) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    // Emit castVote event
    socket.emit('castVote', {
      roomCode: currentRoom.roomCode,
      playerId: playerId,
      rating: rating
    })
  }

  // Render host setup screen
  const renderHostSetup = () => (
    <HostSetupContainer>
      {/* Leave Game Button */}
      <HostLeaveButton onClick={handleLeaveRoom}>
        ← leave game
      </HostLeaveButton>

      {/* Setup Title */}
      <SetupTitle>
        Set Up Your Game!
      </SetupTitle>

      {/* Dropdown Menus */}
      <DropdownContainer>
        {/* Category Dropdown */}
        <Box sx={{ width: '100%' }}>
          <DropdownLabel>category</DropdownLabel>
          <FormControl fullWidth>
            <StyledSelect
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              displayEmpty
            >
              <MenuItem value="Hemisphere">hemisphere</MenuItem>
              <MenuItem value="Continent">continent</MenuItem>
              <MenuItem value="Region">region</MenuItem>
              <MenuItem value="Country">country</MenuItem>
            </StyledSelect>
          </FormControl>
        </Box>

        {/* Difficulty Dropdown */}
        <Box sx={{ width: '100%' }}>
          <DropdownLabel>difficulty</DropdownLabel>
          <FormControl fullWidth>
            <StyledSelect
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              displayEmpty
            >
              <MenuItem value="Easy">easy</MenuItem>
              <MenuItem value="Medium">medium</MenuItem>
              <MenuItem value="Hard">hard</MenuItem>
            </StyledSelect>
          </FormControl>
        </Box>

        {/* Timer Length Dropdown */}
        <Box sx={{ width: '100%' }}>
          <DropdownLabel>timer length</DropdownLabel>
          <FormControl fullWidth>
            <StyledSelect
              value={timerLength}
              onChange={(e) => {
                console.log('RoomPage: Timer length changed to:', e.target.value)
                setTimerLength(e.target.value)
              }}
              displayEmpty
            >
              <MenuItem value="30 mins">30 mins</MenuItem>
              <MenuItem value="1 hour">1 hour</MenuItem>
              <MenuItem value="2 hours">2 hours</MenuItem>
              <MenuItem value="3 hours">3 hours</MenuItem>
            </StyledSelect>
          </FormControl>
        </Box>

        {/* Continue Button */}
        <ContinueButton
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? 'Starting Game...' : 'Continue'}
        </ContinueButton>
      </DropdownContainer>
    </HostSetupContainer>
  )

  // Render waiting screen for non-host players
  const renderWaitingScreen = () => (
    <WaitingContainer>
      {/* Leave Game Button */}
      <WaitingLeaveButton onClick={handleLeaveRoom}>
        ← leave game
      </WaitingLeaveButton>

      {/* Waiting Text */}
      <WaitingText>
        wait for the host!
      </WaitingText>
    </WaitingContainer>
  )

  // Render globe spinning screen
  const renderGlobeSpinning = () => (
    <GlobeSpinningContainer>
      {/* Leave Game Button */}
      <GlobeLeaveButton onClick={handleLeaveRoom}>
        ← leave game
      </GlobeLeaveButton>

      {/* Globe Spinning Text */}
      <GlobeSpinningText>
        globe spinning
      </GlobeSpinningText>

      {/* Challenge Text */}
      <ChallengeText>
        challenge: {currentPrompt || 'yap yap yap'}
      </ChallengeText>

      {/* Next Button (Host Only) */}
      {isHost && (
        <GlobeNextButton
          onClick={handleNextToGame}
          disabled={isLoading}
        >
          {isLoading ? 'starting...' : 'next'}
        </GlobeNextButton>
      )}
    </GlobeSpinningContainer>
  )

  // Render lobby view
  const renderLobby = () => (
    <RoomContainer>
      {/* Leave Game Button */}
      <LeaveButton onClick={handleLeaveRoom}>
        ← leave game
      </LeaveButton>

      {/* Main Content */}
      <ContentContainer>
        {/* Game Code Section */}
        <GameCodeSection>
          <GameCodeLabel>game code</GameCodeLabel>
          <GameCodeValue>{currentRoom.roomCode}</GameCodeValue>
        </GameCodeSection>

        {/* Players Section */}
        <Box sx={{ width: '100%' }}>
          <PlayersLabel sx={{ mb: 2 }}>Players:</PlayersLabel>
          
          {/* Player Slots */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {Array.from({ length: 6 }, (_, index) => {
              const player = players[index]
        return (
                <PlayerSlot key={index}>
                  <PlayerText>
                    {player ? `Player ${index + 1}: ${player.name}` : `Player ${index + 1}:`}
                  </PlayerText>
                </PlayerSlot>
              )
            })}
          </Box>
        </Box>

        {/* Start Game Button (Host Only) */}
        {isHost && gameState === 'lobby' && (
          <StartGameButton
            onClick={handleStartGame}
            disabled={isLoading || players.length < 2}
          >
            {isLoading ? 'Starting Game...' : 'Start Game'}
          </StartGameButton>
        )}

        {/* Waiting Message for Non-Hosts */}
        {!isHost && (
          <Typography sx={{ color: '#666', textAlign: 'center' }}>
            Waiting for the host to start the game...
          </Typography>
        )}
      </ContentContainer>
    </RoomContainer>
  )

  // Render different views based on game state and host status
  console.log('RoomPage render - gameState:', gameState, 'isHost:', isHost, 'timerLength:', timerLength)
  
  if (gameState === 'hostSetup') {
    if (isHost) {
      return renderHostSetup()
    } else {
      return renderWaitingScreen()
    }
  } else if (gameState === 'submitting') {
    return renderGlobeSpinning()
  } else if (gameState === 'gameScreen') {
    console.log('RoomPage: Rendering GameScreen with selectedLocation:', selectedLocation)
    console.log('RoomPage: Rendering GameScreen with category:', category)
    console.log('RoomPage: Rendering GameScreen with currentPrompt:', currentPrompt)
    
    // Use fallback location if server didn't provide one
    const locationToUse = selectedLocation || getFallbackLocation(category)
    console.log('RoomPage: Using location:', locationToUse)
    
    return (
      <GameScreen
        currentPrompt={currentPrompt}
        timeRemaining={timeRemaining}
        players={players}
        onLeaveGame={handleLeaveRoom}
        onFinishedCooking={handleFinishedCooking}
        timerLength={timerLength}
        category={category}
        selectedLocation={locationToUse}
      />
    )
  } else if (gameState === 'voting') {
    return (
      <VotingScreen
        players={players}
        currentPlayerId={players.find(p => p.socketId === socket?.id)?._id}
        onVote={handleVote}
        onLeaveGame={handleLeaveRoom}
        isLoading={isLoading}
        hasVoted={hasVoted}
      />
    )
  } else {
    return renderLobby()
  }
}

export default RoomPage