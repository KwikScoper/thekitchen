import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [roomData, setRoomData] = useState(null)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAutoRejoining, setIsAutoRejoining] = useState(false)

  // Initialize socket connection once for the entire app
  useEffect(() => {
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)
    
    // Track if we're attempting auto-rejoin to suppress error messages
    
    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('App: Connected to server')
      
      // Check if we have stored player info for auto-rejoin
      const storedPlayer = localStorage.getItem('thekitchen_player')
      if (storedPlayer) {
        try {
          const playerInfo = JSON.parse(storedPlayer)
          const timeSinceLastActivity = Date.now() - playerInfo.timestamp
          
          // Only auto-rejoin if it's been less than 1 hour
          if (timeSinceLastActivity < 60 * 60 * 1000) {
            console.log('App: Auto-rejoining player:', playerInfo.playerName, 'to room:', playerInfo.roomCode)
            setIsAutoRejoining(true)
            
            // Add a small delay to ensure server is ready
            setTimeout(() => {
              newSocket.emit('joinRoom', {
                roomCode: playerInfo.roomCode,
                playerName: playerInfo.playerName
              })
            }, 1000)
          } else {
            console.log('App: Stored player info is too old, clearing')
            localStorage.removeItem('thekitchen_player')
          }
        } catch (error) {
          console.error('App: Error parsing stored player info:', error)
          localStorage.removeItem('thekitchen_player')
        }
      }
    })
    
    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('App: Disconnected from server')
    })

    newSocket.on('connected', (data) => {
      console.log('App: Server connection confirmed:', data)
    })

    // Handle errors from auto-rejoin attempts
    newSocket.on('error', (error) => {
      // If it's a room not found error during auto-rejoin, clear stored info silently
      if (error.code === 'ROOM_NOT_FOUND' && isAutoRejoining) {
        console.log('App: Room not found during auto-rejoin, clearing stored player info')
        localStorage.removeItem('thekitchen_player')
        setIsAutoRejoining(false)
        return // Don't show error to user during auto-rejoin
      }
      
      // If it's a player not found error during auto-rejoin, clear stored info silently
      if (error.code === 'PLAYER_NOT_FOUND' && isAutoRejoining) {
        console.log('App: Player not found during auto-rejoin, clearing stored player info')
        localStorage.removeItem('thekitchen_player')
        setIsAutoRejoining(false)
        return // Don't show error to user during auto-rejoin
      }
      
      // For all other errors, log them normally
      console.error('App: Socket error:', error)
    })

    // Start heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('heartbeat')
      }
    }, 30000) // Send heartbeat every 30 seconds

    // Handle page refresh/close - clean up player
    const handleBeforeUnload = (event) => {
      if (newSocket.connected && roomData) {
        // Emit leave room event to clean up player
        // Use sendBeacon for more reliable delivery during page unload
        try {
          newSocket.emit('leaveRoom', {
            roomCode: roomData.roomCode
          })
        } catch (error) {
          console.log('App: Error emitting leaveRoom during unload:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup socket on component unmount
    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      newSocket.disconnect()
    }
  }, [roomData])

  const handleRoomCreated = (data) => {
    console.log('Room created in App:', data)
    setRoomData(data)
    setCurrentView('room')
    
    // Reset auto-rejoin flag since we successfully created a room
    setIsAutoRejoining(false)
    
    // Store player info in localStorage for reconnection
    const playerInfo = {
      roomCode: data.roomCode,
      playerName: data.players.find(p => p.isHost)?.name,
      isHost: true,
      timestamp: Date.now()
    }
    localStorage.setItem('thekitchen_player', JSON.stringify(playerInfo))
  }

  const handleRoomJoined = (data) => {
    console.log('Room joined in App:', data)
    setRoomData(data)
    setCurrentView('room')
    
    // Reset auto-rejoin flag since we successfully joined
    setIsAutoRejoining(false)
    
    // Store player info in localStorage for reconnection
    const playerInfo = {
      roomCode: data.roomCode,
      playerName: data.players.find(p => p.socketId === socket?.id)?.name,
      isHost: false,
      timestamp: Date.now()
    }
    localStorage.setItem('thekitchen_player', JSON.stringify(playerInfo))
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    setRoomData(null)
    
    // Clear stored player info when manually leaving
    localStorage.removeItem('thekitchen_player')
  }

  return (
    <div className="App">
      {currentView === 'home' && (
        <HomePage 
          socket={socket}
          isConnected={isConnected}
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
        />
      )}
      
      {currentView === 'room' && roomData && (
        <RoomPage 
          socket={socket}
          isConnected={isConnected}
          roomData={roomData}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  )
}

export default App
