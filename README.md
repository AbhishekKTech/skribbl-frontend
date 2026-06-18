# Skribbl.io Clone - Real-Time Multiplayer Game

A full-stack, real-time multiplayer drawing and guessing game built as a clone of skribbl.io. This project features a strict turn-based game loop, real-time canvas synchronization, time-based scoring algorithms, and a custom Object-Oriented game engine.

## Live Deployment

- **Frontend (Play Here):** [https://skribbl-frontend-mocha.vercel.app](https://skribbl-frontend-mocha.vercel.app)
- **Backend API Endpoint:** [https://skribbl-backend-axey.onrender.com](https://skribbl-backend-axey.onrender.com)

---

## Architecture Overview

The application utilizes a decoupled Full-Stack architecture to ensure low latency and scalable gameplay:

1. **Frontend (Next.js & HTML5 Canvas):**
   - Manages the modern "Glassmorphism" UI, Room configurations, and Game phases (Lobby, Word Selection, Drawing, Reveal, Game Over)
   - **Canvas Engine:** Uses native HTML5 `<canvas>` to capture `onMouseMove` events. Stroke coordinates `(x0, y0, x1, y1)` and brush settings are emitted instantly to the server
   - **Undo Logic:** Maintains an array of Base64 image snapshots (`canvasHistory`). On undo, the previous snapshot is redrawn using `drawImage()`

2. **Backend Engine (Node.js & Express):**
   - Acts as the authoritative source of truth. It manages room states, turn logic, and timers to prevent any client-side manipulation

3. **Real-Time Sync (Socket.IO):**
   - Facilitates bi-directional communication. Drawing strokes (`draw_data`), canvas clears (`canvas_clear`), and state undos (`undo_canvas`) are broadcasted at high frequencies with minimal overhead

---

## Core Mechanics & Features

- **Multiplayer Rooms:** Host can create rooms with custom configurable settings (Max Players: 2-20, Rounds: 2-10, Draw Time: 15-240s)
- **Turn-Based Rounds:** System automatically tracks `drawnPlayers`. A drawer is given 15 seconds to choose from 3 random words before the timer strictly begins
- **Real-Time Drawing:** Fluid stroke rendering synced across all active clients in the room. Tools include multiple colors, clear canvas, and an Undo feature
- **Smart Scoring Algorithm:** Dynamic points are awarded based on how fast a player guesses correctly: `Math.floor((timeLeft / totalTime) * 500) + 100`
- **Game End & Leaderboard:** Sorts players strictly by `totalPoints` to announce the Winner and display final standings

---

## OOP Implementation

As per the bonus requirements, the WebSocket backend is strictly structured using **Object-Oriented Programming (OOP)** principles for high maintainability:

- `SessionEngine`: A singleton coordinator that manages the lifecycle of all active `GameSession` maps
- `GameSession`: Encapsulates the core game loop, timers, word selection logic, player turns, and broadcast events for a specific room
- `Participant`: Represents an individual player, maintaining their specific state like `connectionId`, `displayName`, `totalPoints`, and `isCurrentlyDrawing` status

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | Next.js, React, Tailwind CSS | UI, Routing, and Glassmorphism Styling |
| Canvas | HTML5 Canvas API | Raw stroke rendering and Base64 state snapshots |
| Backend | Node.js, Express.js | API structure and server environment |
| WebSockets | Socket.IO | High-frequency bi-directional data transfer |
| Deployment | Vercel (Frontend), Render (Backend) | Serverless UI hosting and persistent WS backend |

---

## Local Setup Instructions

Follow these steps to run the game locally on your machine.

### 1. Start the Backend

```bash
# Navigate to the backend directory
cd skribbl-backend

# Install dependencies
npm install

# Start the Node.js server (Runs on port 4000)
node src/main.js
```

### 2. Start the Frontend

```bash
# Navigate to the frontend directory
cd skribbl-frontend

# Install dependencies
npm install

# IMPORTANT: For local testing, update src/lib/socket.ts to use http://localhost:4000

# Start the Next.js development server
npm run dev
```

The app will be available at http://localhost:3000

---

Designed & Developed by AbhishekKTech