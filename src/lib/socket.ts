// src/lib/socket.ts
import { io } from 'socket.io-client';

// Deployment ke time hum .env mein backend URL dalenge, local ke liye localhost:4000
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// autoConnect: false rakha hai taaki jab user submit kare tabhi server se connect ho
export const socket = io(BACKEND_URL, {
    autoConnect: false, 
});