# Skribbl.io Clone - Real-Time Multiplayer Drawing Game

**Live Demo Video:**
https://youtu.be/dsrWwDutcLw?si=jVqoMPMQlV90A0oH

A full-stack, real-time multiplayer drawing and guessing game inspired by Skribbl.io. The project implements a strict turn-based game loop, real-time canvas synchronization, time-based scoring, and a custom Object-Oriented game engine.

---

# Live Deployment

**Frontend:**
https://skribbl-frontend-mocha.vercel.app

**Backend API:**
https://skribbl-backend-axey.onrender.com

---

## 📸 Application Screenshots

<img width="1442" height="862" alt="looby" src="https://github.com/user-attachments/assets/b87af9f8-d55a-4b21-85d3-7010d61a154f" />

*Room Lobby and Configuration UI*

<img width="1873" height="872" alt="wait_area" src="https://github.com/user-attachments/assets/e32da0f8-5e6c-4bcb-9622-e38cae0333e3" />

*Real-time Canvas Sync and Chat Guessing*

<img width="1872" height="872" alt="win" src="https://github.com/user-attachments/assets/adb9bf46-6398-42c1-ad90-88a0afceb740" />

---

# Architecture Overview

The application follows a decoupled full-stack architecture designed for low latency and scalable multiplayer gameplay.

## 1. Frontend (Next.js + HTML5 Canvas)

Responsible for:

* Room creation and management
* Game phases (Lobby, Word Selection, Drawing, Reveal, Game Over)
* Glassmorphism-based user interface

### Canvas Engine

* Uses native HTML5 `<canvas>`
* Captures drawing events in real time
* Sends stroke coordinates `(x0, y0, x1, y1)` and brush settings to the server instantly

### Undo System

* Stores Base64 image snapshots in `canvasHistory`
* Restores previous canvas state using `drawImage()`

---

## 2. Backend Engine (Node.js + Express)

Acts as the authoritative game server.

Responsibilities include:

* Room management
* Turn handling
* Timer management
* Score calculation
* State synchronization

---

## 3. Real-Time Communication (Socket.IO)

Provides bi-directional communication between clients and server.

Events include:

* `draw_data`
* `canvas_clear`
* `undo_canvas`
* Room updates
* Score updates
* Game state transitions

---

# Core Features

## Multiplayer Rooms

Hosts can configure:

* Players: 2–20
* Rounds: 2–10
* Draw Time: 15–240 seconds

## Turn-Based Gameplay

* Tracks completed drawers using `drawnPlayers`
* Drawer receives 3 random words
* 15-second word selection phase
* Drawing timer starts automatically

## Real-Time Drawing

Features:

* Smooth synchronized drawing
* Multiple brush colors
* Canvas clearing
* Undo functionality

## Dynamic Scoring System

Points are awarded based on how quickly a player guesses the word:

```javascript
Math.floor((timeLeft / totalTime) * 500) + 100
```

## Leaderboard & Winner Detection

* Players ranked by `totalPoints`
* Final leaderboard displayed after all rounds
* Winner announced automatically

---

# Object-Oriented Design

The backend is structured using Object-Oriented Programming principles.

## SessionEngine

Singleton coordinator responsible for:

* Managing active game sessions
* Room lifecycle management

## GameSession

Handles:

* Core game loop
* Turn rotation
* Word selection
* Timers
* Scoring
* Event broadcasting

## Participant

Represents an individual player and stores:

* Connection ID
* Display Name
* Total Points
* Drawing Status

---

# Technology Stack

| Layer      | Technology                   | Purpose                    |
| ---------- | ---------------------------- | -------------------------- |
| Frontend   | Next.js, React, Tailwind CSS | UI, Routing, Styling       |
| Canvas     | HTML5 Canvas API             | Drawing & State Management |
| Backend    | Node.js, Express.js          | Server & Game Logic        |
| WebSockets | Socket.IO                    | Real-Time Communication    |
| Deployment | Vercel, Render               | Hosting & Deployment       |

---

# Frontend Project Structure

```text
skribbl-frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── room/[id]/
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       └── socket.ts
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

# Backend Project Structure

```text
skribbl-backend/
├── src/
│   ├── config/
│   ├── coordinators/
│   │   └── SessionEngine.js
│   ├── domain/
│   │   ├── GameSession.js
│   │   └── Participant.js
│   └── main.js
├── .gitignore
├── package-lock.json
└── package.json
```

---

# Local Setup

## 1. Start Backend

```bash
cd skribbl-backend

npm install

node src/main.js
```

Backend runs on:

```text
http://localhost:4000
```

---

## 2. Start Frontend

```bash
cd skribbl-frontend

npm install

# Update src/lib/socket.ts
# Change API URL to:
# http://localhost:4000

npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

---

# Author

Designed and Developed by **Abhishek Sharma** [meetabhishek.in](https://www.meetabhishek.in/)
