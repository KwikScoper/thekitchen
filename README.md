# The Kitchen - AI Cooking Game

A real-time multiplayer cooking game where players receive AI-generated cooking prompts, cook real meals, submit photos, and vote on each other's creations.

## Project Structure

```
/thekitchen
├── /client          # React frontend application
├── /server          # Node.js backend application
├── .gitignore       # Git ignore rules
└── README.md        # This file
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for both client and server:
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

### Development

1. Start the MongoDB service
2. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```
3. Start the frontend development server:
   ```bash
   cd client
   npm run dev
   ```

## Game Flow

1. **Create/Join Room**: Players create or join game rooms using unique codes
2. **AI Prompt**: AI generates creative cooking challenges
3. **Cooking Phase**: Players cook real meals based on the prompt
4. **Submission**: Players upload photos of their creations
5. **Voting**: All players vote on the submissions
6. **Results**: Winner is announced based on votes

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.IO
- **AI Service**: OpenAI/Gemini (placeholder)
- **Image Service**: Cloudinary (placeholder)

## Contributing

This project is in active development. See the implementation plan for current development phases.

## License

ISC