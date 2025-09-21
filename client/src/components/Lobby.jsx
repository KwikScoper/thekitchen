import React from 'react'

const Lobby = ({ roomCode, players, isHost, isLoading, onStartGame }) => {
  return (
    <div className="space-y-6">
      {/* Room Code Display */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>waiting room</h2>
        <p className="text-gray-600 mb-4" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>share this room code with your friends:</p>
        <div className="bg-gray-100 p-4 rounded-lg inline-block">
          <span className="text-3xl font-mono font-bold text-gray-800">{roomCode}</span>
        </div>
      </div>

      {/* Players List */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>
          players ({players.length})
        </h3>
        <div className="space-y-3">
          {players.map((player, index) => (
            <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                  <span className="text-gray-800 font-medium" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>{player.name}</span>
                {player.isHost && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>
                    host
                  </span>
                )}
              </div>
              <div className={`w-3 h-3 rounded-full ${
                player.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Game Button (Host Only) */}
      {isHost && (
        <div className="text-center">
          <button
            onClick={onStartGame}
            disabled={isLoading || players.length < 2}
            className={`font-bold py-3 px-8 rounded-lg transition-colors duration-200 ${
              isLoading || players.length < 2
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
            style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}
          >
            {isLoading ? 'starting game...' : 'start game'}
          </button>
          {players.length < 2 && (
            <p className="text-sm text-gray-500 mt-2" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>
              need at least 2 players to start
            </p>
          )}
        </div>
      )}

      {/* Waiting Message for Non-Hosts */}
      {!isHost && (
        <div className="text-center">
          <p className="text-gray-600" style={{fontFamily: '"Grandstander", cursive', textTransform: 'lowercase'}}>
            waiting for the host to start the game...
          </p>
        </div>
      )}
    </div>
  )
}

export default Lobby
