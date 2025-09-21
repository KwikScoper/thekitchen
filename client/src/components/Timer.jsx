import React from 'react'

const Timer = ({ timeRemaining, phase = 'game' }) => {
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    const minutes = Math.floor(timeRemaining / 60000)
    if (minutes < 1) return 'text-red-600 bg-red-100'
    if (minutes < 2) return 'text-orange-600 bg-orange-100'
    return 'text-green-600 bg-green-100'
  }

  const getPhaseText = () => {
    switch (phase) {
      case 'voting':
        return 'Voting Time'
      case 'submitting':
        return 'Cooking Time'
      default:
        return 'Game Time'
    }
  }

  return (
    <div className={`inline-block p-4 rounded-lg ${getTimerColor()}`}>
      <div className="text-center">
        <p className="text-sm font-medium mb-1">{getPhaseText()}</p>
        <p className="text-2xl font-bold">
          {formatTime(timeRemaining)}
        </p>
      </div>
    </div>
  )
}

export default Timer
