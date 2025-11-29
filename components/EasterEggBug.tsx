import React, { useState, useEffect, useRef } from 'react';
import { X, Zap } from 'lucide-react';

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
  
  // Refs to manage timeouts and loops without causing re-renders
  const stateRef = useRef<'HIDDEN' | 'MOVING' | 'IDLE' | 'FLEEING'>('HIDDEN');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Constants
  const BUG_SIZE = 40;
  
  useEffect(() => {
    // Initial spawn timer (Random start between 10s and 60s)
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
    
    // Spawn between 10 and 45 seconds
    const timeToSpawn = Math.random() * 35000 + 10000;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(spawnBug, timeToSpawn);
  };

  const spawnBug = () => {
    // Start off-screen
    const startX = Math.random() * window.innerWidth;
    const startY = -50; // Top
    
    setPos({ x: startX, y: startY });
    setIsVisible(true);
    stateRef.current = 'MOVING';
    
    moveLoop();
  };

  const moveLoop = () => {
    if (stateRef.current === 'HIDDEN' || stateRef.current === 'FLEEING') return;

    // Decide next action: Move or Idle (Look at user)
    const action = Math.random() > 0.3 ? 'MOVE' : 'IDLE';

    if (action === 'MOVE') {
      stateRef.current = 'MOVING';
      setIsLooking(false);
      setMessage(null);

      // Pick random spot on screen
      const nextX = Math.random() * (window.innerWidth - BUG_SIZE);
      const nextY = Math.random() * (window.innerHeight - BUG_SIZE);

      // Calculate angle
      const dx = nextX - pos.x;
      const dy = nextY - pos.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      setRotation(angle);
      setPos({ x: nextX, y: nextY });

      // Move duration
      const duration = Math.random() * 2000 + 1000;
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(moveLoop, duration);

    } else {
      // IDLE / LOOK
      stateRef.current = 'IDLE';
      setIsLooking(true);
      
      // Chance to speak
      if (Math.random() > 0.5) {
        setMessage(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
      }

      const idleDuration = Math.random() * 1500 + 1000;
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
         // Despawn check (give it a chance to leave)
         if (Math.random() > 0.8) {
            flee(false); // Flee without user interaction (just leaving)
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

    const endX = pos.x + (dirX * 500);
    const endY = pos.y + (dirY * 500);

    const dx = endX - pos.x;
    const dy = endY - pos.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    setRotation(angle);
    setPos({ x: endX, y: endY });

    setTimeout(() => {
      scheduleSpawn();
    }, 1000);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all ease-in-out"
      style={{
        top: pos.y,
        left: pos.x,
        // When fleeing, move faster (0.5s), when moving normally (2-3s)
        transitionDuration: stateRef.current === 'FLEEING' ? '0.5s' : stateRef.current === 'MOVING' ? '2.5s' : '0s',
      }}
    >
        {/* Container for Rotation */}
        <div 
            className="relative pointer-events-auto cursor-pointer"
            onClick={handleClick}
            style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease-out'
            }}
        >
            {/* Message Bubble (Counter-rotated so text is readable) */}
            {message && !isExploding && (
                <div 
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border-2 border-black text-black px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-bounce-in z-20"
                    style={{ transform: `rotate(${-rotation}deg)` }}
                >
                    {message}
                    {/* Little Triangle */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b-2 border-r-2 border-black transform rotate-45"></div>
                </div>
            )}

            {/* THE BUG SVG */}
            <div 
                className={`relative w-10 h-12 transition-all duration-300 ${isExploding ? 'scale-150 opacity-0 filter blur-sm' : 'scale-100'}`}
            >
                {/* EXPLOSION EFFECT */}
                {isExploding && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-12 h-12 text-yellow-500 fill-yellow-400 animate-pulse" />
                    </div>
                )}

                <svg viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
                    {/* LEGS */}
                    <path d="M10 15L2 10" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-wiggle" />
                    <path d="M30 15L38 10" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-wiggle" />
                    
                    <path d="M10 25L1 25" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-wiggle-reverse" />
                    <path d="M30 25L39 25" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-wiggle-reverse" />
                    
                    <path d="M10 35L3 42" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-wiggle" />
                    <path d="M30 35L37 42" stroke="black" strokeWidth="2" strokeLinecap="round" className="animate-wiggle" />

                    {/* BODY */}
                    <ellipse cx="20" cy="25" rx="12" ry="18" fill="black" />
                    
                    {/* ANTENNAE */}
                    <path d="M15 10L10 2" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M25 10L30 2" stroke="black" strokeWidth="1.5" strokeLinecap="round" />

                    {/* EYES (Scalable) */}
                    <g 
                        className={`transition-transform duration-200 origin-center ${isLooking ? 'scale-125' : 'scale-100'}`}
                        style={{ transformOrigin: '20px 25px' }}
                    >
                        {/* White parts */}
                        <circle cx="14" cy="16" r="4" fill="white" />
                        <circle cx="26" cy="16" r="4" fill="white" />
                        
                        {/* Pupils - look at user (center) or random if moving */}
                        <circle cx={isLooking ? 14 : 14 + (Math.random() - 0.5)} cy={isLooking ? 16 : 15} r="1.5" fill="black" />
                        <circle cx={isLooking ? 26 : 26 + (Math.random() - 0.5)} cy={isLooking ? 16 : 15} r="1.5" fill="black" />
                    </g>
                </svg>
            </div>
        </div>
        
        {/* Simple global keyframes for legs */}
        <style dangerouslySetInnerHTML={{__html: `
            @keyframes wiggle {
                0%, 100% { transform: rotate(-5deg); }
                50% { transform: rotate(5deg); }
            }
            .animate-wiggle { animation: wiggle 0.2s infinite ease-in-out; transform-origin: center; }
            .animate-wiggle-reverse { animation: wiggle 0.3s infinite reverse ease-in-out; transform-origin: center; }
            @keyframes bounce-in {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }
            .animate-bounce-in { animation: bounce-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}} />
    </div>
  );
};

export default EasterEggBug;