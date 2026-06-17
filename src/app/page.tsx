// ==========================================
// FILE: src/app/page.tsx
// PURPOSE: THE LOBBY (Create or Join Room)
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { Gamepad2, Users } from 'lucide-react';

export default function LobbyScreen() {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  // Clean state on load
  useEffect(() => {
    socket.disconnect();
  }, []);

 const handleCreateRoom = () => {
    if (!name.trim()) return alert('Bhai, apna naam toh daal do!');
    
    socket.connect();
    socket.emit('create_room', { hostName: name, settings: { drawTime: 80 } }, (response: any) => {
      if (response.success) {
        // 🔥 FIX: Removed &host=true. Sab ek hi tarah se join karenge!
        router.push(`/room/${response.roomId}?name=${encodeURIComponent(name)}`);
      } else {
        alert(response.message);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) return alert('Bhai, apna naam toh daal do!');
    if (!roomId.trim()) return alert('Room ID required!');

    // Direct to Game Room (Logic is handled there)
    router.push(`/room/${roomId}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 font-sans">
      <div className="bg-[#1A2235] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight flex justify-center items-center gap-3">
            <Gamepad2 size={40} className="text-blue-400" />
            Skribbl Clone
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Draw, guess, and win.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AbhishekKTech"
              className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg shadow-blue-500/20"
          >
            Create New Room
          </button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium">OR JOIN WITH CODE</span>
            <div className="flex-grow border-t border-gray-700"></div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter 6-digit Room ID"
              className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-white uppercase transition-all"
            />
            <button
              onClick={handleJoinRoom}
              className="w-full flex items-center justify-center gap-2 bg-[#2D1B4E] border border-purple-500/30 hover:bg-[#3D256A] text-purple-300 font-bold py-3 px-4 rounded-xl transition duration-200"
            >
              <Users size={20} />
              Join Room
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}