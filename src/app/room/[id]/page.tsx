// src/app/room/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { socket } from '@/lib/socket';

export default function GameRoomScreen() {
  const params = useParams(); 
  const roomId = params.id as string; 
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';

  // --- Game State (100% UNTOUCHED) ---
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<{name: string, text: string, type: 'chat'|'system'}[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [wordToDraw, setWordToDraw] = useState('');
  const [phase, setPhase] = useState('Lobby'); // 'Lobby', 'WordSelection', 'ActiveDrawing', 'RoundReveal', 'GameOver'
  const [currentDrawerId, setCurrentDrawerId] = useState(''); 
  
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [gameOverData, setGameOverData] = useState<any>(null);

  // --- Canvas State (100% UNTOUCHED) ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasHistory = useRef<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff'); 
  const [brushSize, setBrushSize] = useState(5);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const triggerJoin = () => {
        if (!roomId || !playerName) return;
        socket.emit('join_room', { roomId, playerName }, (response: any) => {
            if (response && !response.success) alert("⚠️ Error: " + response.message);
        });
    };

    triggerJoin();
    socket.on('connect', triggerJoin);
    socket.on('update_players', (playersList) => setPlayers(playersList));

    // --- CANVAS EVENTS ---
    socket.on('draw_data', (stroke) => {
        drawLineOnCanvas(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size);
    });

    socket.on('canvas_clear', () => clearLocalCanvas());

    socket.on('undo_canvas', (canvasState) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas && canvasState) {
            const img = new Image();
            img.src = canvasState;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        }
    });

    // --- GAME LOOP EVENTS ---
    socket.on('round_start', (data) => {
        setPhase(data.phase);
        setCurrentDrawerId(data.drawerId);
        clearLocalCanvas();
        setWordChoices([]);
        
        if (socket.id !== data.drawerId) {
             setWordToDraw('Waiting for drawer...');
             setMessages(prev => [...prev, { name: 'System', text: 'Drawer is picking a word...', type: 'system' }]);
        }
    });

    socket.on('word_choices', (data) => setWordChoices(data.words));

    socket.on('word_chosen', (data) => {
        setPhase('ActiveDrawing');
        setTimer(data.drawTime);
        if (socket.id !== data.drawerId) {
             setWordToDraw('_ '.repeat(data.wordLength));
             setMessages(prev => [...prev, { name: 'System', text: 'Round Started! Guess the word.', type: 'system' }]);
        }
    });

    socket.on('your_word', (data) => {
        setWordToDraw(data.word);
        setMessages(prev => [...prev, { name: 'System', text: `You are drawing: ${data.word}`, type: 'system' }]);
    });

    socket.on('timer_tick', (data) => setTimer(data.timeLeft));

    socket.on('round_end', (data) => {
        setPhase('RoundReveal');
        setWordToDraw(`The word was: ${data.word}`);
        setPlayers(prevPlayers => data.scores.map((s: any) => {
             const player = prevPlayers.find((p: any) => p.connectionId === s.id);
             return { ...player, totalPoints: s.score, displayName: player?.displayName || 'Player' };
        }));
    });

    socket.on('game_over', (data) => {
        setPhase('GameOver');
        setGameOverData(data);
    });

    socket.on('chat_message', (data) => {
        setMessages(prev => [...prev, { name: data.playerName, text: data.text, type: data.type || 'chat' }]);
    });

    socket.on('guess_result', (data) => {
        if (data.correct) {
            setMessages(prev => [...prev, { name: 'System', text: `${data.playerName} guessed the word! (+${data.points} pts)`, type: 'system' }]);
        }
    });

    return () => {
        socket.off('connect');
        socket.off('update_players');
        socket.off('draw_data');
        socket.off('canvas_clear');
        socket.off('undo_canvas');
        socket.off('round_start');
        socket.off('word_choices');
        socket.off('word_chosen');
        socket.off('your_word');
        socket.off('timer_tick');
        socket.off('round_end');
        socket.off('game_over');
        socket.off('chat_message');
        socket.off('guess_result');
    };
  }, [roomId, playerName]);

  // --- DRAWING LOGIC (100% UNTOUCHED) ---
  const clearLocalCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          canvasHistory.current = [];
      }
  };

  const drawLineOnCanvas = (x0: number, y0: number, x1: number, y1: number, color: string, size: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.closePath();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (socket.id !== currentDrawerId || phase !== 'ActiveDrawing') return; 

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      lastPos.current = { x, y };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !lastPos.current || socket.id !== currentDrawerId) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      drawLineOnCanvas(lastPos.current.x, lastPos.current.y, x, y, color, brushSize);

      socket.emit('draw_data', {
          roomId,
          stroke: { x0: lastPos.current.x, y0: lastPos.current.y, x1: x, y1: y, color, size: brushSize }
      });

      lastPos.current = { x, y };
  };

  const stopDrawing = () => {
      if (isDrawing) {
          setIsDrawing(false);
          lastPos.current = null;
          
          const canvas = canvasRef.current;
          if (canvas) {
              canvasHistory.current.push(canvas.toDataURL());
          }
      }
  };

  const handleUndoClick = () => {
      if (canvasHistory.current.length > 0) {
          canvasHistory.current.pop(); 
          
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx || !canvas) return;

          if (canvasHistory.current.length > 0) {
              const previousState = canvasHistory.current[canvasHistory.current.length - 1];
              const img = new Image();
              img.src = previousState;
              img.onload = () => {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
              };
              socket.emit('undo_canvas', { roomId, canvasState: previousState });
          } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              socket.emit('canvas_clear', { roomId });
          }
      }
  };

  const handleClearCanvasClick = () => {
      clearLocalCanvas();
      socket.emit('canvas_clear', { roomId });
  };

  const handleStartGame = () => {
      socket.emit('start_game', { roomId });
  };

  const submitGuess = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentGuess.trim()) return;
      socket.emit('guess', { roomId, text: currentGuess });
      setCurrentGuess('');
  };

  const isMyTurn = socket.id === currentDrawerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#16123A] to-[#0B0B1A] text-white flex flex-col p-4 md:p-6 font-sans relative overflow-hidden">
      
      {/* Background Glowing Orbs for that Premium Vibe */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Bar (Glassmorphism) */}
      <div className="z-10 flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 px-8 rounded-3xl mb-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div>
              <span className="text-gray-400 text-xs font-bold tracking-[0.2em] uppercase block mb-1">Room Code</span>
              <span className="font-black text-2xl uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{roomId}</span>
          </div>
          <div className="text-center">
              <span className="text-4xl tracking-[0.2em] text-cyan-400 font-mono font-bold drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                  {wordToDraw || 'WAITING...'}
              </span>
          </div>
          <div className="text-right">
              <span className="text-gray-400 text-xs font-bold tracking-[0.2em] uppercase block mb-1">Time Left</span>
              <span className={`font-black text-3xl ${timer <= 10 && timer > 0 ? 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.8)] animate-pulse' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'}`}>
                  {timer}s
              </span>
          </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-1 gap-6 z-10 w-full max-w-[1600px] mx-auto">
          
          {/* Left: Players List (Glassmorphism) */}
          <div className="w-72 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
              <h3 className="font-bold text-gray-300 mb-4 border-b border-white/10 pb-3 tracking-widest uppercase text-sm">Players</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {players.length === 0 && <p className="text-gray-500 text-sm font-medium">Waiting for players...</p>}
                  {players.map((p, i) => (
                      <div key={i} className={`flex justify-between items-center p-3 rounded-2xl border transition-all ${p.connectionId === currentDrawerId ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-black/20 border-white/5'}`}>
                          <span className="font-semibold text-gray-200 truncate pr-2">
                              {p.displayName} {p.connectionId === currentDrawerId && ' ✏️'}
                          </span>
                          <span className="text-sm font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">{p.totalPoints} <span className="text-xs text-gray-500">pts</span></span>
                      </div>
                  ))}
              </div>
              {phase === 'Lobby' && (
                  <button onClick={handleStartGame} className="mt-5 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-bold tracking-wider shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all transform hover:-translate-y-1">
                      START GAME
                  </button>
              )}
          </div>

          {/* Center: The Canvas & Modals */}
          <div className="flex-1 flex flex-col items-center justify-start relative min-w-[800px]">
              
              {/* MODAL: Word Selection */}
              {phase === 'WordSelection' && (
                  <div className="absolute inset-0 bg-[#0B0B1A]/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-3xl">
                      {isMyTurn ? (
                          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(168,85,247,0.3)] text-center animate-fade-in">
                              <h2 className="text-4xl font-black tracking-widest text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] mb-8 uppercase">Choose a word</h2>
                              <div className="flex gap-6 justify-center">
                                  {wordChoices.map(w => (
                                      <button 
                                          key={w} 
                                          onClick={() => socket.emit('choose_word', { roomId, word: w })} 
                                          className="bg-black/40 border border-purple-500/50 hover:bg-purple-600/40 px-8 py-4 rounded-2xl font-bold text-2xl text-white transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]"
                                      >
                                          {w}
                                      </button>
                                  ))}
                              </div>
                              <p className="text-cyan-400 mt-8 font-semibold tracking-widest text-sm">AUTO-SELECTING IN {timer}S</p>
                          </div>
                      ) : (
                          <div className="text-center animate-pulse">
                              <div className="text-7xl mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">🤔</div>
                              <h2 className="text-3xl font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">WAITING FOR DRAWER...</h2>
                          </div>
                      )}
                  </div>
              )}

              {/* MODAL: Game Over Leaderboard */}
              {phase === 'GameOver' && gameOverData && (
                  <div className="absolute inset-0 bg-[#0B0B1A]/90 backdrop-blur-xl flex flex-col items-center justify-center z-30 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                      <h1 className="text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] uppercase">Game Over!</h1>
                      <h2 className="text-4xl text-white mb-10 font-medium">Winner: <span className="font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">{gameOverData.winner?.name}</span> 🏆</h2>
                      
                      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl w-[450px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
                          <h3 className="text-xl font-black mb-6 text-gray-300 border-b border-white/10 pb-4 text-center uppercase tracking-[0.3em]">Final Standings</h3>
                          {gameOverData.leaderboard.map((p: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center my-4 p-4 rounded-2xl transition-all ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'bg-black/40 border border-white/5'}`}>
                                  <span className={`font-bold text-xl ${i === 0 ? 'text-yellow-400' : 'text-gray-200'}`}>#{i + 1} {p.name}</span>
                                  <span className="text-cyan-400 font-black text-2xl drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{p.score} <span className="text-xs text-gray-500 font-medium">pts</span></span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* The Canvas */}
              <div className={`bg-[#0d1126] rounded-3xl overflow-hidden border-2 ${isMyTurn && phase === 'ActiveDrawing' ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-crosshair' : 'border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] cursor-not-allowed'} w-[800px] h-[600px] relative transition-all duration-300`}>
                  <canvas
                      ref={canvasRef}
                      width={800}
                      height={600}
                      className="w-full h-full bg-[#0d1126]"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                  />
                  {!isMyTurn && phase === 'ActiveDrawing' && (
                      <div className="absolute inset-0 bg-transparent pointer-events-none"></div>
                  )}
              </div>

              {/* Canvas Controls (Glassmorphism Pill) */}
              <div className={`mt-6 flex items-center gap-5 bg-white/5 backdrop-blur-xl px-6 py-4 rounded-full border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-opacity duration-300 ${isMyTurn && phase === 'ActiveDrawing' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  
                  {/* Colors */}
                  <div className="flex gap-3">
                      {['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map((c) => (
                          <button 
                              key={c} 
                              onClick={() => setColor(c)} 
                              style={{ backgroundColor: c }}
                              className={`w-10 h-10 rounded-full hover:scale-110 transition-transform shadow-lg ${color === c ? 'ring-4 ring-white/50 scale-110' : 'border border-white/20'}`}
                          ></button>
                      ))}
                  </div>
                  
                  <div className="w-px h-8 bg-white/20 mx-2"></div>
                  
                  {/* Tools */}
                  <button onClick={handleUndoClick} className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-bold px-4 py-2 hover:bg-yellow-400/10 rounded-xl transition-colors">
                      ↩ <span className="tracking-wider uppercase text-sm">Undo</span>
                  </button>
                  
                  <button onClick={handleClearCanvasClick} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold px-4 py-2 hover:bg-red-400/10 rounded-xl transition-colors">
                      🗑️ <span className="tracking-wider uppercase text-sm">Clear</span>
                  </button>
              </div>
          </div>

          {/* Right: Chat & Guesses (Glassmorphism) */}
          <div className="w-80 bg-white/5 backdrop-blur-xl rounded-3xl flex flex-col border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
              <div className="flex-1 p-5 overflow-y-auto space-y-3 custom-scrollbar">
                  {messages.map((msg, i) => (
                      <div key={i} className={`text-sm p-3 rounded-2xl ${msg.type === 'system' ? 'bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20' : i % 2 === 0 ? 'bg-black/20 text-gray-200' : 'bg-transparent text-gray-200'}`}>
                          {msg.type === 'chat' && <span className="font-bold text-purple-400 tracking-wide">{msg.name}: </span>}
                          {msg.text}
                      </div>
                  ))}
              </div>
              <form onSubmit={submitGuess} className="p-4 bg-black/40 border-t border-white/10">
                  <input
                      type="text"
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      disabled={isMyTurn && phase === 'ActiveDrawing'}
                      placeholder={isMyTurn && phase === 'ActiveDrawing' ? "Drawing! No chatting." : "Type your guess here..."}
                      className="w-full px-5 py-4 bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all font-medium text-white placeholder-gray-500 tracking-wide"
                  />
              </form>
          </div>
      </div>
    </div>
  );
}