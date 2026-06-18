// ==========================================
// FILE: src/app/page.tsx
// PURPOSE: THE LOBBY (Neon Glassmorphism UI) - RESPONSIVE WITH FIXED FOOTER ICONS
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
// Removed Github and Linkedin from here to fix the error
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
    if (!name.trim()) return alert('Enter your name!');
    if (!roomId.trim()) return alert('Room ID required!');
    
    // Mobile keyboard spaces fix
    const cleanRoomId = roomId.trim().toUpperCase();
    const cleanName = name.trim();
    
    router.push(`/room/${cleanRoomId}?name=${encodeURIComponent(cleanName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#16123A] to-[#0B0B1A] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background Glowing Orbs (Responsive sizes) */}
      <div className="absolute top-[-5%] left-[-10%] w-64 h-64 md:w-96 md:h-96 bg-purple-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-10%] w-64 h-64 md:w-96 md:h-96 bg-cyan-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>

      {/* Main Title Section */}
      <div className="text-center mb-8 md:mb-10 z-10 animate-fade-in">
        <div className="flex justify-center items-center gap-3 md:gap-4 mb-2 md:mb-3">
          <Gamepad2 className="w-10 h-10 md:w-12 md:h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.1em] md:tracking-[0.15em] text-white drop-shadow-[0_0_25px_rgba(168,85,247,0.7)]">
            SKRIBBL
          </h1>
        </div>
        <p className="text-cyan-100/50 font-bold tracking-[0.15em] md:tracking-[0.25em] uppercase text-[10px] md:text-xs mt-2">
          Multiplayer Drawing & Guessing
        </p>
      </div>

      {/* Glassmorphism Central Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] z-10 space-y-4 md:space-y-6">
        
        {/* Name Input with Dice */}
        <div className="flex gap-2 md:gap-3 w-full">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your alias"
            className="flex-1 min-w-0 px-3 py-3 md:px-5 md:py-4 bg-black/40 border border-gray-700/50 rounded-xl md:rounded-2xl font-semibold text-sm md:text-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all"
          />
          <button 
            onClick={pickRandomName}
            className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-3 md:p-4 rounded-xl md:rounded-2xl text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center group"
            title="Generate Random Name"
          >
            <Dices className="w-5 h-5 md:w-7 md:h-7 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        {/* Room Settings Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between bg-black/20 hover:bg-black/40 border border-gray-700/50 text-gray-300 font-semibold py-3 px-4 md:py-4 md:px-6 rounded-xl md:rounded-2xl transition-all"
          >
            <span className="flex items-center gap-2 md:gap-3 text-sm md:text-base"><Settings className="w-5 h-5 text-purple-400" /> Session Config</span>
            <span className="text-[10px] md:text-xs tracking-widest text-gray-500">{showSettings ? 'CLOSE' : 'EXPAND'}</span>
          </button>

          {showSettings && (
            <div className="mt-2 md:mt-3 bg-black/40 border border-gray-700/50 p-4 md:p-6 rounded-xl md:rounded-2xl space-y-4 md:space-y-6 animate-fade-in">
              <div>
                <div className="flex justify-between font-semibold text-xs md:text-sm mb-2 md:mb-3 text-gray-300">
                  <span>Total Rounds</span> <span className="text-cyan-400">{rounds}</span>
                </div>
                <input type="range" min="2" max="10" step="1" value={rounds} onChange={(e) => setRounds(parseInt(e.target.value))} className="w-full accent-cyan-400" />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-xs md:text-sm mb-2 md:mb-3 text-gray-300">
                  <span>Draw Duration</span> <span className="text-cyan-400">{drawTime}s</span>
                </div>
                <input type="range" min="15" max="240" step="5" value={drawTime} onChange={(e) => setDrawTime(parseInt(e.target.value))} className="w-full accent-cyan-400" />
              </div>
              <div>
                <div className="flex justify-between font-semibold text-xs md:text-sm mb-2 md:mb-3 text-gray-300">
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
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm md:text-xl py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all transform hover:-translate-y-1"
        >
          <Play className="w-4 h-4 md:w-6 md:h-6" fill="currentColor" /> INITIATE LOBBY
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 md:gap-4 py-1 opacity-50">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="font-semibold text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] text-gray-400 whitespace-nowrap">OR JOIN EXISTING</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Join Room Section (Neon Cyan Gradient) */}
        <div className="flex gap-2 md:gap-3 w-full">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ROOM ID"
            className="flex-1 min-w-0 px-3 py-3 md:px-5 md:py-4 bg-black/40 border border-gray-700/50 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg text-white placeholder-gray-600 tracking-wider md:tracking-widest focus:outline-none focus:border-purple-400/50 transition-colors"
          />
          <button
            onClick={handleJoinRoom}
            className="shrink-0 w-24 md:w-1/3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-sm md:text-lg py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-1 md:gap-2 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] transition-all transform hover:-translate-y-1"
          >
            <Users className="w-4 h-4 md:w-[22px] md:h-[22px]" /> JOIN
          </button>
        </div>

      </div>

      {/* 🚀 Premium Responsive Footer Section (Using Raw SVGs) */}
      <div className="z-10 mt-8 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
        <p className="text-[11px] md:text-xs font-medium tracking-[0.15em] text-gray-400 uppercase">
          Designed & Developed by <span className="text-cyan-400 font-extrabold tracking-normal">Abhishek Sharma</span>
        </p>
        <div className="flex gap-4 mt-1">
          <a 
            href="https://github.com/AbhishekKTech" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors duration-200 transform hover:scale-110"
            title="GitHub Profile"
          >
            {/* Custom GitHub Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
          </a>
          <a 
            href="https://www.linkedin.com/in/abhishekktech/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-[#0A66C2] transition-colors duration-200 transform hover:scale-110"
            title="LinkedIn Profile"
          >
            {/* Custom LinkedIn Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
              <rect x="2" y="9" width="4" height="12"></rect>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
          </a>
        </div>
      </div>

    </div>
  );
}