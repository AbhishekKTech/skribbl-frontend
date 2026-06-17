// ==========================================
// FILE: src/app/room/[id]/page.tsx
// PURPOSE: THE GAME ROOM (Strict Turn Logic)
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

  // --- Game State ---
  const [players, setPlayers] = useState<any[]>([]);
  const [messages, setMessages] = useState<{name: string, text: string, type: 'chat'|'system'}[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [wordToDraw, setWordToDraw] = useState('');
  const [phase, setPhase] = useState('Lobby'); 
  const [currentDrawerId, setCurrentDrawerId] = useState(''); // 🔥 Added to track turns

  // --- Canvas State ---
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
            if (response && !response.success) {
                console.error("Failed to join:", response.message);
                alert("⚠️ Error: " + response.message);
            }
        });
    };

    triggerJoin();
    socket.on('connect', triggerJoin);

    socket.on('update_players', (playersList) => {
        setPlayers(playersList);
    });

    socket.on('draw_data', (stroke) => {
        drawLineOnCanvas(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size);
    });

    socket.on('canvas_clear', () => {
        clearLocalCanvas();
    });

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

    socket.on('round_start', (data) => {
        setPhase('Drawing');
        setTimer(data.drawTime);
        setCurrentDrawerId(data.drawerId); // 🔥 Save the active drawer
        clearLocalCanvas();
        
        if (socket.id !== data.drawerId) {
             setWordToDraw('_ '.repeat(data.wordLength));
             setMessages(prev => [...prev, { name: 'System', text: 'Round Started! Guess the word.', type: 'system' }]);
        }
    });

    socket.on('word_chosen', (data) => {
        setWordToDraw(data.word);
        setMessages(prev => [...prev, { name: 'System', text: `You are drawing: ${data.word}`, type: 'system' }]);
    });

    socket.on('timer_tick', (data) => setTimer(data.timeLeft));

    socket.on('round_end', (data) => {
        setPhase('Reveal');
        setCurrentDrawerId(''); // 🔥 Reset drawer
        setWordToDraw(`The word was: ${data.word}`);
        
        setPlayers(prevPlayers => data.scores.map((s: any) => {
             const player = prevPlayers.find((p: any) => p.connectionId === s.id);
             return { ...player, totalPoints: s.score, displayName: player?.displayName || 'Player' };
        }));
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
        socket.off('round_start');
        socket.off('word_chosen');
        socket.off('timer_tick');
        socket.off('round_end');
        socket.off('chat_message');
        socket.off('guess_result');
    };
  }, [roomId, playerName]);

  const clearLocalCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
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
      // 🔥 RESTRICTION 1: Sirf Drawer hi draw kar sakta hai
      if (socket.id !== currentDrawerId || phase !== 'Drawing') return; 

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
          
          // Save the canvas state after drawing a line
          const canvas = canvasRef.current;
          if (canvas) {
              canvasHistory.current.push(canvas.toDataURL());
          }
      }
  };

  const handleClearCanvasClick = () => {
      clearLocalCanvas();
      socket.emit('canvas_clear', { roomId });
  };

  const handleUndoClick = () => {
      if (canvasHistory.current.length > 0) {
          canvasHistory.current.pop(); // Current state ko hatao
          
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!ctx || !canvas) return;

          if (canvasHistory.current.length > 0) {
              // Purani state ko wapas draw karo
              const previousState = canvasHistory.current[canvasHistory.current.length - 1];
              const img = new Image();
              img.src = previousState;
              img.onload = () => {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
              };
              // Dusre players ko purani state bhejo
              socket.emit('undo_canvas', { roomId, canvasState: previousState });
          } else {
              // Agar history khali ho gayi, toh pura canvas clear kar do
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              socket.emit('canvas_clear', { roomId });
          }
      }
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
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col p-4">
      <div className="flex justify-between items-center bg-[#1A2235] p-4 rounded-xl mb-4 border border-gray-800">
          <div>
              <span className="text-gray-400 text-sm block">Room Code</span>
              <span className="font-bold text-xl uppercase tracking-wider">{roomId}</span>
          </div>
          <div className="text-center">
              <span className="text-3xl tracking-[0.2em] text-blue-400 font-mono">
                  {wordToDraw || 'WAITING...'}
              </span>
          </div>
          <div className="text-right">
              <span className="text-gray-400 text-sm block">Time Left</span>
              <span className={`font-bold text-2xl ${timer <= 10 && timer > 0 ? 'text-red-500' : 'text-white'}`}>
                  {timer}s
              </span>
          </div>
      </div>

      <div className="flex flex-1 gap-4">
          <div className="w-64 bg-[#1A2235] rounded-xl p-4 border border-gray-800 flex flex-col">
              <h3 className="font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2">Players</h3>
              <div className="flex-1 overflow-y-auto space-y-2">
                  {players.length === 0 && <p className="text-gray-500 text-sm">Waiting...</p>}
                  {players.map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#0B0F19] p-2 rounded-lg">
                          <span className="font-medium">
                              {p.displayName} {p.connectionId === currentDrawerId && ' ✏️'}
                          </span>
                          <span className="text-sm text-green-400">{p.totalPoints} pts</span>
                      </div>
                  ))}
              </div>
              {/* 🔥 RESTRICTION 3: Start button sirf Lobby mein dikhega */}
              {phase === 'Lobby' && (
                  <button onClick={handleStartGame} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-bold">
                      Start Game
                  </button>
              )}
          </div>

          <div className="flex-1 flex flex-col items-center">
              <div className={`bg-[#1A2235] rounded-xl overflow-hidden border-4 ${isMyTurn && phase === 'Drawing' ? 'border-green-500 cursor-crosshair' : 'border-gray-700 cursor-not-allowed'} w-[800px] h-[600px] relative shadow-lg transition-colors`}>
                  <canvas
                      ref={canvasRef}
                      width={800}
                      height={600}
                      className="w-full h-full bg-[#1A2235]"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                  />
                  {/* Overlay for Guesser */}
                  {!isMyTurn && phase === 'Drawing' && (
                      <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                  )}
              </div>

              {/* 🔥 RESTRICTION 1: Controls sirf Drawer ko dikhenge */}
              {isMyTurn && phase === 'Drawing' && (
                  <div className="mt-4 flex gap-4 bg-[#1A2235] p-3 rounded-lg border border-gray-800">
                      <button onClick={() => setColor('#ffffff')} className="w-8 h-8 rounded-full bg-white border-2 border-gray-400"></button>
                      <button onClick={() => setColor('#ef4444')} className="w-8 h-8 rounded-full bg-red-500 border-2 border-transparent"></button>
                      <button onClick={() => setColor('#3b82f6')} className="w-8 h-8 rounded-full bg-blue-500 border-2 border-transparent"></button>
                      <button onClick={() => setColor('#22c55e')} className="w-8 h-8 rounded-full bg-green-500 border-2 border-transparent"></button>
                      <div className="border-l border-gray-600 mx-2"></div>
                      
                      <button onClick={handleClearCanvasClick} className="text-red-400 hover:text-red-300 font-bold px-4 py-1">Clear</button>

                      <button onClick={handleUndoClick} className="text-yellow-400 hover:text-yellow-300 font-bold px-4 py-1 border-l border-gray-600">Undo</button>
                  </div>
              )}
          </div>

          <div className="w-80 bg-[#1A2235] rounded-xl flex flex-col border border-gray-800">
              <div className="flex-1 p-4 overflow-y-auto space-y-2">
                  {messages.map((msg, i) => (
                      <div key={i} className={`text-sm ${msg.type === 'system' ? 'text-green-400 font-bold italic' : 'text-gray-200'}`}>
                          {msg.type === 'chat' && <span className="font-bold text-blue-400">{msg.name}: </span>}
                          {msg.text}
                      </div>
                  ))}
              </div>
              <form onSubmit={submitGuess} className="p-3 border-t border-gray-700">
                  {/* 🔥 RESTRICTION 2: Chat input disabled if you are the drawer */}
                  <input
                      type="text"
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      disabled={isMyTurn && phase === 'Drawing'}
                      placeholder={isMyTurn && phase === 'Drawing' ? "You are drawing! No chatting." : "Type your guess here..."}
                      className="w-full px-3 py-2 bg-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
              </form>
          </div>
      </div>
    </div>
  );
}