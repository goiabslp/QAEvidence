
import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';

const PHRASES = [
  "É feature...",
  "Na minha máquina funciona!",
  "Culpem o estagiário",
  "Já limpou o cache?",
  "NullPointer?!",
  "Café?",
  "Commitando...",
  "404",
  "Deploy sexta-feira?",
  "To invisível...",
  "Cadê os logs?",
  "Compilando..."
];

const EasterEggBug: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [rotation, setRotation] = useState(0);
  const [isLooking, setIsLooking] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [moveDuration, setMoveDuration] = useState(0);
  
  // Refs to manage timeouts and loops without causing re-renders
  const stateRef = useRef<'HIDDEN' | 'MOVING' | 'IDLE' | 'FLEEING'>('HIDDEN');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constants
  const BUG_SIZE = 48; // Slightly larger to show detail
  
  useEffect(() => {
    // Initial spawn timer (Rare: 20s to 60s)
    scheduleSpawn();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const scheduleSpawn = () => {
    stateRef.current = 'HIDDEN';
    setIsVisible(false);
    setIsExploding(false);
    setMessage(null);
    
    // Spawn between 20 and 60 seconds (Rare appearance)
    const timeToSpawn = Math.random() * 40000 + 20000;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(spawnBug, timeToSpawn);
  };

  const spawnBug = () => {
    // Start off-screen at a random edge
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let startX = 0, startY = 0;

    switch(edge) {
        case 0: startX = Math.random() * window.innerWidth; startY = -60; break;
        case 1: startX = window.innerWidth + 60; startY = Math.random() * window.innerHeight; break;
        case 2: startX = Math.random() * window.innerWidth; startY = window.innerHeight + 60; break;
        case 3: startX = -60; startY = Math.random() * window.innerHeight; break;
    }
    
    setPos({ x: startX, y: startY });
    setIsVisible(true);
    stateRef.current = 'MOVING';
    
    // Allow DOM to render before moving
    setTimeout(moveLoop, 100);
  };

  const moveLoop = () => {
    if (stateRef.current === 'HIDDEN' || stateRef.current === 'FLEEING') return;

    // Decide next action: Move or Idle (Look at user)
    // 70% chance to move, 30% chance to stop and look
    const action = Math.random() > 0.3 ? 'MOVE' : 'IDLE';

    if (action === 'MOVE') {
      stateRef.current = 'MOVING';
      setIsLooking(false);
      setMessage(null);

      // Pick random spot on screen, avoiding edges to keep it visible
      const padding = 100;
      const nextX = Math.random() * (window.innerWidth - padding * 2) + padding;
      const nextY = Math.random() * (window.innerHeight - padding * 2) + padding;

      // Calculate angle
      const dx = nextX - pos.x;
      const dy = nextY - pos.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      setRotation(angle);
      setPos({ x: nextX, y: nextY });

      // Slow Movement: 3s to 7s duration (Walking pace)
      const duration = Math.random() * 4000 + 3000;
      setMoveDuration(duration);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(moveLoop, duration);

    } else {
      // IDLE / LOOK
      stateRef.current = 'IDLE';
      setIsLooking(true);
      
      // Chance to speak
      if (Math.random() > 0.6) {
        setMessage(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
      }

      const idleDuration = Math.random() * 2000 + 1500;
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
         // Despawn check (chance to leave screen naturally)
         if (Math.random() > 0.85) {
            flee(false); // Flee without fear (just exiting)
         } else {
            moveLoop();
         }
      }, idleDuration);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExploding) return;

    // 50% Explode, 50% Flee
    if (Math.random() > 0.5) {
      triggerExplosion();
    } else {
      flee(true);
    }
  };

  const triggerExplosion = () => {
    setIsExploding(true);
    setMessage("BUG !!!");
    
    // Remove after animation
    setTimeout(() => {
      scheduleSpawn();
    }, 800);
  };

  const flee = (scared: boolean) => {
    stateRef.current = 'FLEEING';
    setIsLooking(false);
    if (scared) setMessage("Aaaah!");
    else setMessage(null);

    // Pick a point WAY off screen based on current position relative to center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const dirX = pos.x > centerX ? 1 : -1;
    const dirY = pos.y > centerY ? 1 : -1;

    // Run far away
    const endX = pos.x + (dirX * 1000);
    const endY = pos.y + (dirY * 1000);

    const dx = endX - pos.x;
    const dy = endY - pos.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    setRotation(angle);
    setPos({ x: endX, y: endY });
    
    // Flee is fast!
    setMoveDuration(800);

    setTimeout(() => {
      scheduleSpawn();
    }, 1000);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none ease-in-out"
      style={{
        top: pos.y,
        left: pos.x,
        transitionProperty: 'top, left',
        transitionDuration: `${moveDuration}ms`,
        transitionTimingFunction: stateRef.current === 'FLEEING' ? 'ease-in' : 'linear',
      }}
    >
        {/* Container for Rotation & Interaction */}
        <div 
            className="relative pointer-events-auto cursor-pointer"
            onClick={handleClick}
            style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' // Smooth turn
            }}
        >
            {/* Message Bubble (Counter-rotated so text is readable) */}
            {message && !isExploding && (
                <div 
                    className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white border-2 border-black text-black px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap shadow-[3px_3px_0px_rgba(0,0,0,0.2)] animate-bounce-in z-20 font-mono"
                    style={{ transform: `rotate(${-rotation}deg)` }}
                >
                    {message}
                    {/* Little Triangle */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-black transform rotate-45"></div>
                </div>
            )}

            {/* THE BUG SVG - OUTLINE STYLE */}
            <div 
                className={`relative w-12 h-16 transition-all duration-300 ${isExploding ? 'scale-150 opacity-0 filter blur-sm' : 'scale-100'} ${stateRef.current === 'MOVING' ? 'animate-body-wobble' : ''}`}
            >
                {/* EXPLOSION EFFECT */}
                {isExploding && (
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <Zap className="w-20 h-20 text-red-500 fill-red-500 animate-pulse" />
                    </div>
                )}

                <svg viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                    {/* LEGS (Strokes only) */}
                    <path d="M10 15L-2 8" stroke="black" strokeWidth="2.5" strokeLinecap="round" className="animate-leg-left-1" />
                    <path d="M30 15L42 8" stroke="black" strokeWidth="2.5" strokeLinecap="round" className="animate-leg-right-1" />
                    
                    <path d="M10 25L-4 25" stroke="black" strokeWidth="2.5" strokeLinecap="round" className="animate-leg-left-2" />
                    <path d="M30 25L44 25" stroke="black" strokeWidth="2.5" strokeLinecap="round" className="animate-leg-right-2" />
                    
                    <path d="M10 35L-2 42" stroke="black" strokeWidth="2.5" strokeLinecap="round" className="animate-leg-left-3" />
                    <path d="M30 35L42 42" stroke="black" strokeWidth="2.5" strokeLinecap="round" className="animate-leg-right-3" />

                    {/* BODY (Outline, transparent fill) */}
                    <path 
                        d="M20 5 C 10 5, 2 15, 5 35 C 7 45, 15 48, 20 48 C 25 48, 33 45, 35 35 C 38 15, 30 5, 20 5 Z" 
                        stroke="black" 
                        strokeWidth="3" 
                        fill="none" 
                    />
                    
                    {/* ANTENNAE */}
                    <path d="M15 8L8 -5" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-antenna" />
                    <path d="M25 8L32 -5" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-antenna-alt" />

                    {/* EYES (Scalable, White background to pop) */}
                    <g 
                        className={`transition-transform duration-300 origin-center ${isLooking ? 'scale-150' : 'scale-100'}`}
                        style={{ transformOrigin: '20px 20px' }}
                    >
                        {/* White parts (to hide body line behind) */}
                        <circle cx="13" cy="18" r="5" fill="white" stroke="black" strokeWidth="2" />
                        <circle cx="27" cy="18" r="5" fill="white" stroke="black" strokeWidth="2" />
                        
                        {/* Pupils */}
                        <circle cx={isLooking ? 13 : 13 + (Math.random() - 0.5) * 2} cy={isLooking ? 18 : 17} r="2" fill="black" />
                        <circle cx={isLooking ? 27 : 27 + (Math.random() - 0.5) * 2} cy={isLooking ? 18 : 17} r="2" fill="black" />
                    </g>
                </svg>
            </div>
        </div>
        
        {/* CSS Keyframes for Bug Animation */}
        <style dangerouslySetInnerHTML={{__html: `
            /* Body wobbles when walking */
            @keyframes body-wobble {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(2deg); }
                75% { transform: rotate(-2deg); }
            }
            .animate-body-wobble { animation: body-wobble 0.5s infinite ease-in-out; }

            /* Legs Movement - Alternating tripod gait */
            @keyframes leg-wiggle {
                0%, 100% { transform: rotate(-15deg); }
                50% { transform: rotate(15deg); }
            }
            .animate-leg-left-1 { animation: leg-wiggle 0.4s infinite ease-in-out; transform-origin: 10px 15px; }
            .animate-leg-right-2 { animation: leg-wiggle 0.4s infinite ease-in-out; transform-origin: 30px 25px; }
            .animate-leg-left-3 { animation: leg-wiggle 0.4s infinite ease-in-out; transform-origin: 10px 35px; }
            
            .animate-leg-right-1 { animation: leg-wiggle 0.4s infinite reverse ease-in-out; transform-origin: 30px 15px; }
            .animate-leg-left-2 { animation: leg-wiggle 0.4s infinite reverse ease-in-out; transform-origin: 10px 25px; }
            .animate-leg-right-3 { animation: leg-wiggle 0.4s infinite reverse ease-in-out; transform-origin: 30px 35px; }

            /* Antennae twitch */
            @keyframes antenna-twitch {
                0%, 100% { transform: rotate(-5deg); }
                50% { transform: rotate(5deg); }
            }
            .animate-antenna { animation: antenna-twitch 2s infinite ease-in-out; transform-origin: 15px 8px; }
            .animate-antenna-alt { animation: antenna-twitch 2.5s infinite reverse ease-in-out; transform-origin: 25px 8px; }

            @keyframes bounce-in {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}} />
    </div>
  );
};

export default EasterEggBug;
