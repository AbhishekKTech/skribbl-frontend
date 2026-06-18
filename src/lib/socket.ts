// src/lib/socket.ts
import { io } from 'socket.io-client';

// Backend URL from environment or default to production URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://skribbl-backend-axey.onrender.com';

// Connect to server only when user submits
export const socket = io(BACKEND_URL, {
    autoConnect: false, 
});