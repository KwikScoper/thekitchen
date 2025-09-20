import { useState, useEffect } from 'react'

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
  
  // Submission states
  const [submissions, setSubmissions] = useState([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submissionProgress, setSubmissionProgress] = useState({})
  
  // Voting states
  const [votes, setVotes] = useState({})
  const [hasVoted, setHasVoted] = useState(false)
  const [votingProgress, setVotingProgress] = useState({})
  
  // Results states
  const [results, setResults] = useState(null)
  const [winner, setWinner] = useState(null)

  // Set up socket event listeners and join room
  useEffect(() => {
    if (!socket || !roomData) return

    console.log('RoomPage: Setting up socket listeners for room:', roomData.roomCode)

    // Room management events
    socket.on('roomUpdate', (data) => {
      console.log('RoomPage: Room update received:', data)
      console.log('RoomPage: Current players before update:', players)
      console.log('RoomPage: New players from update:', data.data?.players)
      
      setCurrentRoom(data.data)
      setPlayers(data.data?.players || [])
      setGameState(data.data?.gameState || 'lobby')
      setCurrentPrompt(data.data?.currentPrompt || '')
      
      // Update host status
      const currentPlayer = data.data?.players?.find(p => p.socketId === socket.id)
      setIsHost(currentPlayer?.isHost || false)
      
      console.log('RoomPage: Players updated to:', data.data?.players)
    })

    socket.on('playerJoined', (data) => {
      console.log('Player joined:', data)
      setSuccess(`${data.playerName} joined the room`)
      // Room update will handle the player list update
    })

    socket.on('playerLeft', (data) => {
      console.log('Player left:', data)
      setSuccess(`${data.playerName} left the room`)
      // Room update will handle the player list update
    })

    socket.on('playerReconnected', (data) => {
      console.log('Player reconnected:', data)
      setSuccess(`${data.data?.playerName || 'A player'} is back from cooking`)
      // Update players list with reconnection status
      if (data.data?.players) {
        setPlayers(data.data.players)
      }
    })

    socket.on('playerDisconnected', (data) => {
      console.log('Player disconnected:', data)
      setSuccess(`${data.data?.playerName || 'A player'} is cooking`)
      // Update players list with disconnection status
      if (data.data?.players) {
        setPlayers(data.data.players)
      }
    })

    // Game management events
    socket.on('gameStarted', (data) => {
      console.log('Game started:', data)
      setGameState('submitting')
      setCurrentPrompt(data.data?.currentPrompt || '')
      setGameStartTime(new Date())
      setSuccess('Game started! Check your cooking prompt below.')
      setIsLoading(false)
    })

    socket.on('submissionSuccess', (data) => {
      console.log('Submission successful:', data)
      setHasSubmitted(true)
      setSuccess('Image submitted successfully!')
      setIsLoading(false)
    })

    socket.on('submissionUpdate', (data) => {
      console.log('Submission update:', data)
      setSubmissions(data.submissions || [])
      setSubmissionProgress(data.progress || {})
      
      // Check if all players have submitted
      if (data.data?.allPlayersSubmitted) {
        setSuccess('All players have submitted! Voting will start soon.')
      }
    })

    socket.on('votingStarted', (data) => {
      console.log('Voting started:', data)
      setGameState('voting')
      setVotingStartTime(new Date())
      setSubmissions(data.submissions || [])
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
      
      // Check if all players have voted
      if (data.data?.allPlayersVoted) {
        setSuccess('All players have voted! Results coming soon.')
      }
    })

    socket.on('resultsReady', (data) => {
      console.log('Results ready:', data)
      setGameState('results')
      setResults(data.data?.submissions || [])
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
        
        // Update host status
        const currentPlayer = data.data?.players?.find(p => p.socketId === socket.id)
        setIsHost(currentPlayer?.isHost || false)
      }
    })

    // If we have room data but socket just connected, we need to join the room
    if (roomData && roomData.roomCode && isConnected) {
      console.log('RoomPage: Socket connected, joining room:', roomData.roomCode)
      // Don't emit joinRoom here - let the user manually rejoin from the home page
      // This prevents the "Reconnecting Player" issue
    }

    // Clean up event listeners when component unmounts
    return () => {
      socket.off('roomUpdate')
      socket.off('roomJoined')
      socket.off('playerJoined')
      socket.off('playerLeft')
      socket.off('playerReconnected')
      socket.off('playerDisconnected')
      socket.off('gameStarted')
      socket.off('submissionSuccess')
      socket.off('submissionUpdate')
      socket.off('votingStarted')
      socket.off('voteSuccess')
      socket.off('voteUpdate')
      socket.off('resultsReady')
      socket.off('error')
    }
  }, [socket, roomData, isConnected])

  // Debug effect to log player changes
  useEffect(() => {
    console.log('RoomPage: Players state changed:', players)
  }, [players])

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

  // Timer effect for game phases
  useEffect(() => {
    let interval = null
    
    if (gameState === 'submitting' && gameStartTime) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = now - gameStartTime
        const remaining = Math.max(0, 5 * 60 * 1000 - elapsed) // 5 minutes default
        setTimeRemaining(remaining)
        
        if (remaining === 0) {
          setSuccess('Time\'s up! Submit your dish now.')
        }
      }, 1000)
    } else if (gameState === 'voting' && votingStartTime) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = now - votingStartTime
        const remaining = Math.max(0, 2 * 60 * 1000 - elapsed) // 2 minutes default
        setTimeRemaining(remaining)
        
        if (remaining === 0) {
          setSuccess('Voting time is up!')
        }
      }, 1000)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [gameState, gameStartTime, votingStartTime])

  // Game action handlers
  const handleStartGame = () => {
    if (!socket || !isConnected || !isHost) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    socket.emit('startGame', {
      roomCode: currentRoom.roomCode
    })
  }

  const handleSubmitImage = (imageData) => {
    if (!socket || !isConnected || hasSubmitted) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    socket.emit('submitImage', {
      roomCode: currentRoom.roomCode,
      imageData: imageData
    })
  }

  const handleStartVoting = () => {
    if (!socket || !isConnected || !isHost) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    socket.emit('startVoting', {
      roomCode: currentRoom.roomCode
    })
  }

  const handleCastVote = (submissionId) => {
    if (!socket || !isConnected || hasVoted) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    socket.emit('castVote', {
      roomCode: currentRoom.roomCode,
      submissionId: submissionId
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

  // Format time remaining
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Render different game states
  const renderGameState = () => {
    switch (gameState) {
      case 'lobby':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Waiting for Players</h2>
              <p className="text-gray-600 mb-6">
                Share the room code <span className="font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded">{currentRoom.roomCode}</span> with friends to join!
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Players ({players.length})</h3>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={`${player.id}-${player.socketId}-${index}`} className="flex items-center justify-between bg-white p-3 rounded-md">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-800">{player.name}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        player.isConnected ? 'bg-green-500' : 'bg-yellow-500'
                      }`} title={player.isConnected ? 'Connected' : 'Cooking'}></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {player.isHost && (
                        <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                          Host
                        </span>
                      )}
                      {!player.isConnected && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                          Cooking
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {isHost && (
              <div className="text-center">
                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2 || isLoading}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Starting...' : 'Start Game'}
                </button>
                {players.length < 2 && (
                  <p className="text-sm text-gray-500 mt-2">Need at least 2 players to start</p>
                )}
              </div>
            )}
          </div>
        )

      case 'submitting':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Cooking Time!</h2>
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg mb-4">
                <p className="text-lg font-semibold">{currentPrompt}</p>
              </div>
              <div className="text-2xl font-mono font-bold text-gray-800">
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Submission Progress</h3>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md">
                    <span className="text-gray-800">{player.name}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      submissionProgress[player._id] 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {submissionProgress[player._id] ? 'Submitted' : 'Cooking...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {!hasSubmitted && (
              <div className="text-center">
                <button
                  onClick={() => handleSubmitImage('mock-image-data')}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Submitting...' : 'Submit Image'}
                </button>
                <p className="text-sm text-gray-500 mt-2">Upload a photo of your dish</p>
              </div>
            )}
          </div>
        )

      case 'voting':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Vote for Your Favorite!</h2>
              <div className="text-lg font-mono font-bold text-gray-800 mb-4">
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissions.map((submission, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                  <div className="bg-gray-200 h-32 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-gray-500">Image Placeholder</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800 font-medium">{submission.playerName}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{votes[submission._id] || 0} votes</span>
                      <button
                        onClick={() => handleCastVote(submission._id)}
                        disabled={hasVoted || isLoading}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm px-3 py-1 rounded transition-colors duration-200"
                      >
                        Vote
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Voting Progress</h3>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md">
                    <span className="text-gray-800">{player.name}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      votingProgress[player._id] 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {votingProgress[player._id] ? 'Voted' : 'Voting...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'results':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Game Results!</h2>
              {winner && (
                <div className="bg-yellow-100 text-yellow-800 px-6 py-4 rounded-lg mb-6">
                  <h3 className="text-xl font-bold">🏆 Winner: {winner.playerName}</h3>
                  <p className="text-lg">{winner.voteCount} votes</p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {results && results.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  result.playerId === winner?.playerId 
                    ? 'bg-yellow-50 border-2 border-yellow-300' 
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{result.playerName}</span>
                    <span className="text-lg font-bold text-gray-800">{result.voteCount} votes</span>
                  </div>
                </div>
              ))}
            </div>
            
            {isHost && (
              <div className="text-center">
                <button
                  onClick={() => setGameState('lobby')}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center">
            <p className="text-gray-600">Unknown game state: {gameState}</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🍳 Room: {currentRoom.roomCode}
              </h1>
              <p className="text-gray-600">
                Game State: <span className="font-semibold capitalize">{gameState}</span>
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              
              <button
                onClick={handleLeaveRoom}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Main Game Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {renderGameState()}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>Step 12: Room Page and State Management</p>
          <p>Socket.IO integration and game state management working</p>
        </div>
      </div>
    </div>
  )
}

export default RoomPage
