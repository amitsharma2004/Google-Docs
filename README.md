# Google Docs Clone - Collaborative Document Editor

A real-time collaborative document editor built with React, Node.js, Socket.IO, and Operational Transformation (OT).

## Features

- Real-time collaborative editing with multiple users
- Operational Transformation for conflict resolution
- User authentication with JWT
- Document management (create, list, edit)
- Rich text editing with Quill
- WebSocket-based synchronization

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Redux Toolkit
- Quill Editor
- Socket.IO Client
- React Router

### Backend
- Node.js + Express + TypeScript
- MongoDB (document storage)
- Redis (session management)
- Socket.IO (real-time communication)
- JWT authentication
- Operational Transformation engine

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Redis (v7 or higher)
- npm or yarn

## Installation

### 1. Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Set Up Environment Variables

#### Server Configuration
```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/gdocs
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_ORIGIN=http://localhost:5173
```

#### Client Configuration
```bash
cd client
cp .env.example .env
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Start Required Services

#### MongoDB
```bash
# Windows (if installed as service)
net start MongoDB

# Or using mongod directly
mongod --dbpath C:\data\db

# macOS/Linux
brew services start mongodb-community
# or
sudo systemctl start mongod
```

#### Redis
```bash
# Windows (using WSL or Redis for Windows)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

### 4. Run the Application

#### Start the Server (Terminal 1)
```bash
cd server
npm run dev
```

Server will run on http://localhost:5000

#### Start the Client (Terminal 2)
```bash
cd client
npm run dev
```

Client will run on http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Register a new account or login
3. Create a new document or open an existing one
4. Share the document URL with others to collaborate in real-time
5. Start editing - changes will sync automatically across all connected users

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   └── store/         # Redux store
│   └── package.json
│
├── server/                # Node.js backend
│   ├── src/
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── socket/       # Socket.IO handlers
│   └── package.json
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Documents
- `GET /api/docs` - List all documents
- `POST /api/docs` - Create new document
- `GET /api/docs/:id` - Get document by ID
- `PUT /api/docs/:id` - Update document
- `DELETE /api/docs/:id` - Delete document

## WebSocket Events

### Client → Server
- `join-document` - Join a document room
- `send-operation` - Send editing operation
- `leave-document` - Leave document room

### Server → Client
- `document-loaded` - Initial document data
- `receive-operation` - Receive operation from other users
- `user-joined` - User joined the document
- `user-left` - User left the document

## Development

### Build for Production

#### Server
```bash
cd server
npm run build
npm start
```

#### Client
```bash
cd client
npm run build
npm run preview
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env`
- Verify database path exists

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping` (should return PONG)
- Check Redis URL in `.env`

### Port Already in Use
- Change PORT in `server/.env`
- Update VITE_API_URL and VITE_SOCKET_URL in `client/.env`

### WebSocket Connection Failed
- Ensure server is running before client
- Check CORS settings in `server/src/app.ts`
- Verify CLIENT_ORIGIN matches your client URL

## License

MIT
