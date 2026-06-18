// ==========================================
// src/app/room/[id]/page.tsx
// PURPOSE: THE GAME ROOM (Neon Glassmorphism UI) - RESPONSIVE FIXED
// ==========================================

'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { socket } from '@/lib/socket';

export default function GameRoomScreen() {
  const params = useParams(); 
  const roomId = params.id as string; 
  const searchParams = useSearchParams();
  const playerName = searchParams.get('name') || 'Player';

  // Game state
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<{name: string, text: string, type: 'chat'|'system'}[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [wordToDraw, setWordToDraw] = useState('');
  const [phase, setPhase] = useState('Lobby'); // 'Lobby', 'WordSelection', 'ActiveDrawing', 'RoundReveal', 'GameOver'
  const [currentDrawerId, setCurrentDrawerId] = useState(''); 
  
  const [wordChoices, setWordChoices] = useState<string[]>([]);
  const [gameOverData, setGameOverData] = useState<any>(null);

  // Canvas state
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

    // Canvas events
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

    // Game events
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

  // Drawing logic
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

  // 🛠️ Updated for Canvas Scaling & Mobile Touch
  const getCoordinates = (e: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX = e.clientX;
      let clientY = e.clientY;

      if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      }

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  const startDrawing = (e: any) => {
      if (socket.id !== currentDrawerId || phase !== 'ActiveDrawing') return; 
      const coords = getCoordinates(e);
      if (!coords) return;

      setIsDrawing(true);
      lastPos.current = coords;
  };

  const draw = (e: any) => {
      if (!isDrawing || !lastPos.current || socket.id !== currentDrawerId) return;
      const coords = getCoordinates(e);
      if (!coords) return;

      drawLineOnCanvas(lastPos.current.x, lastPos.current.y, coords.x, coords.y, color, brushSize);

      socket.emit('draw_data', {
          roomId,
          stroke: { x0: lastPos.current.x, y0: lastPos.current.y, x1: coords.x, y1: coords.y, color, size: brushSize }
      });

      lastPos.current = coords;
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
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1A] via-[#16123A] to-[#0B0B1A] text-white flex flex-col p-2 md:p-4 lg:p-6 font-sans relative overflow-hidden">
      
    {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-purple-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-cyan-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"></div>

    {/* Top bar - Made flex-wrap and responsive text for mobile */}
      {/* Top bar - Fixed with Grid for perfect centering and one-line layout */}
      <div className="z-10 grid grid-cols-3 items-center bg-white/5 backdrop-blur-xl border border-white/10 p-3 md:p-4 px-4 md:px-8 rounded-2xl md:rounded-3xl mb-4 md:mb-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] w-full">
          
          {/* Left: Room Code */}
          <div className="text-left overflow-hidden">
              <span className="text-gray-400 text-[8px] md:text-xs font-bold tracking-[0.2em] uppercase block mb-1">Room Code</span>
              <span className="font-black text-sm md:text-2xl uppercase tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] truncate block">
                  {roomId}
              </span>
          </div>
          
          {/* Center: Word to Draw (Perfectly Centered) */}
          <div className="text-center flex justify-center items-center overflow-hidden px-1 md:px-2">
              <span className="text-base md:text-4xl tracking-[0.05em] md:tracking-[0.2em] text-cyan-400 font-mono font-bold drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] truncate max-w-full">
                  {wordToDraw || 'WAITING...'}
              </span>
          </div>
          
          {/* Right: Time Left */}
          <div className="text-right overflow-hidden">
              <span className="text-gray-400 text-[8px] md:text-xs font-bold tracking-[0.2em] uppercase block mb-1">Time Left</span>
              <span className={`font-black text-lg md:text-3xl block ${timer <= 10 && timer > 0 ? 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.8)] animate-pulse' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'}`}>
                  {timer}s
              </span>
          </div>
          
      </div>

      {/* Main Content Layout - Stacks on mobile, row on lg screens */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 z-10 w-full max-w-[1600px] mx-auto">
          
          {/* Canvas Section - Order 1 on Mobile, Center on lg */}
          <div className="order-1 lg:order-2 flex-1 flex flex-col items-center justify-start relative w-full lg:min-w-[800px]">
              
              {/* Modal: word selection */}
              {phase === 'WordSelection' && (
                  <div className="absolute inset-0 bg-[#0B0B1A]/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-2xl md:rounded-3xl p-4">
                      {isMyTurn ? (
                          <div className="bg-white/10 backdrop-blur-xl p-6 md:p-10 rounded-2xl md:rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(168,85,247,0.3)] text-center animate-fade-in w-full max-w-lg">
                              <h2 className="text-2xl md:text-4xl font-black tracking-widest text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] mb-6 md:mb-8 uppercase">Choose a word</h2>
                              <div className="flex flex-col md:flex-row gap-3 md:gap-6 justify-center">
                                  {wordChoices.map(w => (
                                      <button 
                                          key={w} 
                                          onClick={() => socket.emit('choose_word', { roomId, word: w })} 
                                          className="bg-black/40 border border-purple-500/50 hover:bg-purple-600/40 px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-2xl text-white transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]"
                                      >
                                          {w}
                                      </button>
                                  ))}
                              </div>
                              <p className="text-cyan-400 mt-6 md:mt-8 font-semibold tracking-widest text-xs md:text-sm">AUTO-SELECTING IN {timer}S</p>
                          </div>
                      ) : (
                          <div className="text-center animate-pulse">
                              <div className="text-5xl md:text-7xl mb-4 md:mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">🤔</div>
                              <h2 className="text-xl md:text-3xl font-bold text-cyan-400 tracking-widest drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">WAITING FOR DRAWER...</h2>
                          </div>
                      )}
                  </div>
              )}

              {/* Modal: game over */}
              {phase === 'GameOver' && gameOverData && (
                  <div className="absolute inset-0 bg-[#0B0B1A]/90 backdrop-blur-xl flex flex-col items-center justify-center z-30 rounded-2xl md:rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-4">
                      <h1 className="text-4xl md:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4 md:mb-6 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)] uppercase text-center">Game Over!</h1>
                      <h2 className="text-2xl md:text-4xl text-white mb-6 md:mb-10 font-medium text-center">Winner: <span className="font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">{gameOverData.winner?.name}</span> 🏆</h2>
                      
                      <div className="bg-white/5 backdrop-blur-xl p-5 md:p-8 rounded-2xl md:rounded-3xl w-full max-w-[450px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] max-h-[50vh] overflow-y-auto custom-scrollbar">
                          <h3 className="text-lg md:text-xl font-black mb-4 md:mb-6 text-gray-300 border-b border-white/10 pb-3 md:pb-4 text-center uppercase tracking-[0.3em]">Final Standings</h3>
                          {gameOverData.leaderboard.map((p: any, i: number) => (
                              <div key={i} className={`flex justify-between items-center my-3 md:my-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'bg-black/40 border border-white/5'}`}>
                                  <span className={`font-bold text-lg md:text-xl ${i === 0 ? 'text-yellow-400' : 'text-gray-200'} truncate mr-2`}>#{i + 1} {p.name}</span>
                                  <span className="text-cyan-400 font-black text-xl md:text-2xl drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] whitespace-nowrap">{p.score} <span className="text-[10px] md:text-xs text-gray-500 font-medium">pts</span></span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* The canvas - Using aspect-video and max-width for responsiveness */}
              <div className={`w-full max-w-[800px] aspect-[4/3] bg-[#0d1126] rounded-2xl md:rounded-3xl overflow-hidden border-2 ${isMyTurn && phase === 'ActiveDrawing' ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)] cursor-crosshair' : 'border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] cursor-not-allowed'} relative transition-all duration-300`}>
                  <canvas
                      ref={canvasRef}
                      width={800} // Internal resolution stays 800x600
                      height={600}
                      className="w-full h-full bg-[#0d1126] touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      onTouchCancel={stopDrawing}
                  />
                  {!isMyTurn && phase === 'ActiveDrawing' && (
                      <div className="absolute inset-0 bg-transparent pointer-events-none"></div>
                  )}
              </div>

              {/* Canvas controls (Optimized for Mobile) */}
              <div className={`mt-2 md:mt-6 w-full max-w-[800px] flex flex-wrap justify-center items-center gap-1.5 md:gap-5 bg-white/5 backdrop-blur-xl px-2 md:px-6 py-2 md:py-4 rounded-xl md:rounded-full border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-opacity duration-300 ${isMyTurn && phase === 'ActiveDrawing' ? 'opacity-100 flex' : 'opacity-0 pointer-events-none hidden lg:flex'}`}>
                  
                  {/* Colors - Smaller on mobile */}
                  <div className="flex gap-1.5 md:gap-3 flex-wrap justify-center">
                      {['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map((c) => (
                          <button 
                              key={c} 
                              onClick={() => setColor(c)} 
                              style={{ backgroundColor: c }}
                              className={`w-6 h-6 md:w-10 md:h-10 rounded-full hover:scale-110 transition-transform shadow-lg ${color === c ? 'ring-2 md:ring-4 ring-white/50 scale-110' : 'border border-white/20'}`}
                          ></button>
                      ))}
                  </div>
                  
                  <div className="hidden md:block w-px h-8 bg-white/20 mx-2"></div>
                  
                  {/* Tools - Compact text and padding on mobile */}
                  <div className="flex gap-1 md:gap-2 mt-1 md:mt-0 w-full md:w-auto justify-center">
                      <button onClick={handleUndoClick} className="flex items-center justify-center gap-1 md:gap-2 text-yellow-400 hover:text-yellow-300 font-bold px-2 md:px-4 py-1.5 md:py-2 hover:bg-yellow-400/10 rounded-lg md:rounded-xl transition-colors">
                          ↩ <span className="tracking-wider uppercase text-[10px] md:text-sm">Undo</span>
                      </button>
                      
                      <button onClick={handleClearCanvasClick} className="flex items-center justify-center gap-1 md:gap-2 text-red-400 hover:text-red-300 font-bold px-2 md:px-4 py-1.5 md:py-2 hover:bg-red-400/10 rounded-lg md:rounded-xl transition-colors">
                          🗑️ <span className="tracking-wider uppercase text-[10px] md:text-sm">Clear</span>
                      </button>
                  </div>
              </div>
          </div>

          {/* Chat Section - Optimized Input and Message Sizes for Mobile */}
          <div className="order-2 lg:order-3 w-full lg:w-80 h-[22vh] lg:h-[600px] bg-white/5 backdrop-blur-xl rounded-xl md:rounded-3xl flex flex-col border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
              <div className="flex-1 p-2 md:p-5 overflow-y-auto space-y-1.5 md:space-y-3 custom-scrollbar">
                  {messages.map((msg, i) => (
                      <div key={i} className={`text-xs md:text-sm p-2 md:p-3 rounded-lg md:rounded-2xl ${msg.type === 'system' ? 'bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/20' : i % 2 === 0 ? 'bg-black/20 text-gray-200' : 'bg-transparent text-gray-200'}`}>
                          {msg.type === 'chat' && <span className="font-bold text-purple-400 tracking-wide">{msg.name}: </span>}
                          {msg.text}
                      </div>
                  ))}
              </div>
              <form onSubmit={submitGuess} className="p-1.5 md:p-4 bg-black/40 border-t border-white/10">
                  <input
                      type="text"
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      disabled={isMyTurn && phase === 'ActiveDrawing'}
                      placeholder={isMyTurn && phase === 'ActiveDrawing' ? "Drawing! No chatting." : "Type your guess..."}
                      className="w-full px-3 py-1.5 md:px-5 md:py-4 bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-md md:rounded-2xl focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 transition-all font-medium text-xs md:text-base text-white placeholder-gray-500 tracking-wide"
                  />
              </form>
          </div>

          {/* Players Section - Order 3 on Mobile, Left on lg */}
          <div className="order-3 lg:order-1 w-full lg:w-72 max-h-[30vh] lg:max-h-none bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-5 flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] overflow-hidden">
              <h3 className="font-bold text-gray-300 mb-3 md:mb-4 border-b border-white/10 pb-2 md:pb-3 tracking-widest uppercase text-xs md:text-sm">Players</h3>
              <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 pr-2 custom-scrollbar">
                  {players.length === 0 && <p className="text-gray-500 text-xs md:text-sm font-medium">Waiting for players...</p>}
                  {players.map((p, i) => (
                      <div key={i} className={`flex justify-between items-center p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all ${p.connectionId === currentDrawerId ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-black/20 border-white/5'}`}>
                          <span className="font-semibold text-gray-200 text-sm md:text-base truncate pr-2">
                              {p.displayName} {p.connectionId === currentDrawerId && ' ✏️'}
                          </span>
                          <span className="text-xs md:text-sm font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] whitespace-nowrap">{p.totalPoints} <span className="text-[10px] text-gray-500">pts</span></span>
                      </div>
                  ))}
              </div>
              {phase === 'Lobby' && (
                  <button onClick={handleStartGame} className="mt-4 md:mt-5 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold tracking-wider text-sm md:text-base shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all transform hover:-translate-y-1">
                      START GAME
                  </button>
              )}
          </div>

      </div>
    </div>
  );
}