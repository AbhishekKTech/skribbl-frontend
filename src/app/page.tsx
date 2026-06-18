// ==========================================
// FILE: src/app/page.tsx
// PURPOSE: THE LOBBY (Neon Glassmorphism UI)
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { Dices, Settings, Play, Users, Gamepad2 } from 'lucide-react';

export default function LobbyScreen() {
  // State management for user input and room settings
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [showSettings, setShowSettings] = useState(false);

  const randomNames = ["DoodleKoala", "SketchNinja", "ArtisticPotato", "DrawMaster", "PencilHero"];
  const pickRandomName = () => setName(randomNames[Math.floor(Math.random() * randomNames.length)]);

  useEffect(() => {
    socket.disconnect();
  }, []);

  const handleCreateRoom = () => {
    if (!name.trim()) return alert('Bhai, apna naam toh daal do!');
    
    socket.connect();
    const settings = { rounds, drawTime, maxPlayers };
    
    socket.emit('create_room', { hostName: name, settings }, (response: any) => {
      if (response.success) {
        router.push(`/room/${response.roomId}?name=${encodeURIComponent(name)}`);
      } else {
        alert(response.message);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) return alert('Bhai, apna naam toh daal do!');
    if (!roomId.trim()) return alert('Room ID required!');
    router.push(`/room/${roomId}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#16123A] to-[#0B0B1A] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background Glowing Orbs for that Premium Vibe */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>


      {/* Main Title Section */}
      <div className="text-center mb-10 z-10 animate-fade-in">
        <div className="flex justify-center items-center gap-4 mb-3">
          <Gamepad2 size={48} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
          <h1 className="text-6xl font-black tracking-[0.15em] text-white drop-shadow-[0_0_25px_rgba(168,85,247,0.7)]">
            SKRIBBL
          </h1>
        </div>
        <p className="text-cyan-100/50 font-bold tracking-[0.25em] uppercase text-xs mt-2">
          Multiplayer Drawing & Guessing
        </p>
      </div>

      {/* Glassmorphism Central Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] z-10 space-y-6">
        
        {/* Name Input with Dice */}
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your alias"
            className="flex-1 px-5 py-4 bg-black/40 border border-gray-700/50 rounded-2xl font-semibold text-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
          />
          <button 
            onClick={pickRandomName}
            className="bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center group"
            title="Generate Random Name"
          >
            <Dices size={26} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        {/* Room Settings Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between bg-black/20 hover:bg-black/40 border border-gray-700/50 text-gray-300 font-semibold py-4 px-6 rounded-2xl transition-all"
          >
            <span className="flex items-center gap-3"><Settings size={20} className="text-purple-400" /> Session Config</span>
            <span className="text-xs tracking-widest text-gray-500">{showSettings ? 'CLOSE' : 'EXPAND'}</span>
          </button>

          {showSettings && (
            <div className="mt-3 bg-black/40 border border-gray-700/50 p-6 rounded-2xl space-y-6 animate-fade-in">
              <div>
                <div className="flex justify-between font-semibold text-sm mb-3 text-gray-300">
                  <span>Total Rounds</span> <span className="text-cyan-400">{rounds}</span>
                </div>
                <input type="range" min="2" max="10" step="1" value={rounds} onChange={(e) => setRounds(parseInt(e.target.value))} className="w-full accent-cyan-400" />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-sm mb-3 text-gray-300">
                  <span>Draw Duration</span> <span className="text-cyan-400">{drawTime}s</span>
                </div>
                <input type="range" min="15" max="240" step="5" value={drawTime} onChange={(e) => setDrawTime(parseInt(e.target.value))} className="w-full accent-cyan-400" />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-sm mb-3 text-gray-300">
                  <span>Max Capacity</span> <span className="text-cyan-400">{maxPlayers} Players</span>
                </div>
                <input type="range" min="2" max="20" step="1" value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))} className="w-full accent-cyan-400" />
              </div>
            </div>
          )}
        </div>

        {/* Create Room Button (Neon Purple Gradient) */}
        <button
          onClick={handleCreateRoom}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xl py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all transform hover:-translate-y-1"
        >
          <Play size={24} fill="currentColor" /> INITIATE LOBBY
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2 opacity-50">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="font-semibold text-xs tracking-[0.2em] text-gray-400">OR JOIN EXISTING</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Join Room Section (Neon Cyan Gradient) */}
        <div className="flex gap-3">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ROOM ID"
            className="w-3/5 px-5 py-4 bg-black/40 border border-gray-700/50 rounded-2xl font-bold text-lg text-white placeholder-gray-600 tracking-widest focus:outline-none focus:border-purple-400/50 transition-colors"
          />
          <button
            onClick={handleJoinRoom}
            className="w-2/5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] transition-all transform hover:-translate-y-1"
          >
            <Users size={22} /> JOIN
          </button>
        </div>

      </div>
    </div>
  );
}