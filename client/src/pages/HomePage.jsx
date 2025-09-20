import { useState, useEffect } from 'react'

const HomePage = ({ socket, isConnected, onRoomJoined, onRoomCreated }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  
  // Room creation state
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [showJoinRoom, setShowJoinRoom] = useState(false)

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

  const resetForms = () => {
    setPlayerName('')
    setRoomCode('')
    setError('')
    setSuccess('')
    setShowCreateRoom(false)
    setShowJoinRoom(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🍳 The Kitchen
          </h1>
          <p className="text-gray-600 text-lg">
            AI Cooking Game
          </p>
          
          {/* Connection Status */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-4 ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
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

        {/* Main Action Buttons */}
        {!showCreateRoom && !showJoinRoom && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreateRoom(true)}
              disabled={!isConnected || isLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Create Room
            </button>
            
            <button
              onClick={() => setShowJoinRoom(true)}
              disabled={!isConnected || isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Join Room
            </button>
          </div>
        )}

        {/* Create Room Form */}
        {showCreateRoom && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 text-center">Create Room</h2>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="createPlayerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="createPlayerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading || !playerName.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Creating...' : 'Create Room'}
                </button>
                
                <button
                  type="button"
                  onClick={resetForms}
                  disabled={isLoading}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Room Form */}
        {showJoinRoom && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 text-center">Join Room</h2>
            
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label htmlFor="joinPlayerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="joinPlayerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 4-letter room code"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading || !playerName.trim() || !roomCode.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Joining...' : 'Join Room'}
                </button>
                
                <button
                  type="button"
                  onClick={resetForms}
                  disabled={isLoading}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Game Description */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">How to Play:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Create or join a room with friends</li>
            <li>• Receive an AI-generated cooking prompt</li>
            <li>• Cook a real meal based on the prompt</li>
            <li>• Submit photos of your creation</li>
            <li>• Vote on everyone's dishes</li>
            <li>• See who wins!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HomePage
