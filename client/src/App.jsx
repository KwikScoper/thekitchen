import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const connectSocket = () => {
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)
    
    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
    })
    
    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
    })
  }

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [socket])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          The Kitchen
        </h1>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Welcome to The Kitchen - AI Cooking Game
            </p>
            <div className={`px-4 py-2 rounded-md text-sm ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? 'Connected to server' : 'Not connected'}
            </div>
          </div>
          
          <button
            onClick={connectSocket}
            disabled={isConnected}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              isConnected
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isConnected ? 'Connected' : 'Connect to Server'}
          </button>
          
          <div className="text-center text-sm text-gray-500">
            <p>Step 3: Frontend Foundation Setup Complete</p>
            <p>Vite + React + Tailwind CSS + Socket.IO Client</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
