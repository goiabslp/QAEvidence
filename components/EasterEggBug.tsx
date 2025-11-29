
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bug as BugIcon, Bomb } from 'lucide-react';

type BugMode = 'NORMAL' | 'NINJA';
type BugState = 'HIDDEN' | 'SPAWNING' | 'WALKING' | 'IDLE' | 'LOOKING' | 'DYING';

const SCREEN_PADDING = 100;

const EasterEggBug: React.FC = () => {
  const [bugState, setBugState] = useState<BugState>('HIDDEN');
  const [mode, setMode] = useState<BugMode>('NORMAL');
  const [pos, setPos] = useState({ x: -100, y: -100, rotation: 0 });
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [isExploding, setIsExploding] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);

  // Behavior loop reference
  const behaviorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveInterval = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  
  // Refs for current values to access inside animation frames without re-renders
  const posRef = useRef(pos);
  const targetRef = useRef(targetPos);
  const speedRef = useRef(2);

  // --- UTILS ---
  const getRandomPos = () => {
    return {
      x: Math.random() * (window.innerWidth - SCREEN_PADDING * 2) + SCREEN_PADDING,
      y: Math.random() * (window.innerHeight - SCREEN_PADDING * 2) + SCREEN_PADDING
    };
  };

  const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI) + 90;
  };

  // --- LIFECYCLE: SPAWNING ---
  const scheduleSpawn = useCallback(() => {
    // Random time between 15s and 60s (made shorter for testing visibility, realistically should be higher)
    const time = Math.random() * 45000 + 15000; 
    
    if (behaviorTimeout.current) clearTimeout(behaviorTimeout.current);
    
    behaviorTimeout.current = setTimeout(() => {
      spawnBug();
    }, time);
  }, []);

  const spawnBug = () => {
    const startX = Math.random() > 0.5 ? -50 : window.innerWidth + 50;
    const startY = Math.random() * window.innerHeight;
    
    // 30% Chance to be a NINJA (Fast, hard to click)
    const isNinja = Math.random() < 0.3;
    setMode(isNinja ? 'NINJA' : 'NORMAL');
    speedRef.current = isNinja ? 8 : 2.5;

    const initialPos = { x: startX, y: startY, rotation: 0 };
    setPos(initialPos);
    posRef.current = initialPos;
    
    setBugState('SPAWNING');
    
    // Start walking immediately
    const firstTarget = getRandomPos();
    setTargetPos(firstTarget);
    targetRef.current = firstTarget;
    
    setBugState('WALKING');
    startMovementLoop();
  };

  // --- MOVEMENT LOOP ---
  const startMovementLoop = () => {
    if (moveInterval.current) cancelAnimationFrame(moveInterval.current);

    const animate = () => {
      if (bugState === 'DYING' || bugState === 'HIDDEN' || bugState === 'IDLE' || bugState === 'LOOKING') return;

      const dx = targetRef.current.x - posRef.current.x;
      const dy = targetRef.current.y - posRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        // Reached destination, decide next move
        decideNextBehavior();
        return;
      }

      // Move towards target
      const angle = Math.atan2(dy, dx);
      const moveX = Math.cos(angle) * speedRef.current;
      const moveY = Math.sin(angle) * speedRef.current;

      posRef.current = {
        x: posRef.current.x + moveX,
        y: posRef.current.y + moveY,
        rotation: (angle * 180 / Math.PI) + 90
      };

      setPos({ ...posRef.current });
      moveInterval.current = requestAnimationFrame(animate);
    };

    moveInterval.current = requestAnimationFrame(animate);
  };

  // --- AI BEHAVIOR ---
  const decideNextBehavior = () => {
    if (moveInterval.current) cancelAnimationFrame(moveInterval.current);
    
    // Ninja just keeps running mostly
    if (mode === 'NINJA' && Math.random() > 0.2) {
       const next = getRandomPos();
       setTargetPos(next);
       targetRef.current = next;
       startMovementLoop();
       return;
    }

    const action = Math.random();

    if (action < 0.4) {
      // WALK AGAIN
      const next = getRandomPos();
      setTargetPos(next);
      targetRef.current = next;
      setBugState('WALKING');
      startMovementLoop();
    } else if (action < 0.7) {
      // IDLE & LOOK
      setBugState('IDLE');
      setTimeout(() => {
        setBugState('LOOKING'); // Eyes move
        if (Math.random() > 0.7) setSpeech(mode === 'NINJA' ? "..." : "Hehe");
        
        setTimeout(() => {
           setSpeech(null);
           setBugState('WALKING');
           const next = getRandomPos();
           setTargetPos(next);
           targetRef.current = next;
           startMovementLoop();
        }, 2000);
      }, 1000);
    } else {
       // LEAVE SCREEN
       const exitX = Math.random() > 0.5 ? -100 : window.innerWidth + 100;
       const exitY = Math.random() * window.innerHeight;
       setTargetPos({ x: exitX, y: exitY });
       targetRef.current = { x: exitX, y: exitY };
       setBugState('WALKING');
       
       // Detect when off screen to reset
       const checkExit = setInterval(() => {
          const d = Math.sqrt(Math.pow(targetRef.current.x - posRef.current.x, 2) + Math.pow(targetRef.current.y - posRef.current.y, 2));
          if (d < 20) {
             clearInterval(checkExit);
             setBugState('HIDDEN');
             scheduleSpawn();
          }
       }, 500);
       startMovementLoop();
    }
  };

  // --- INTERACTION ---
  const handleInteraction = (type: 'CLICK' | 'HOVER') => {
    if (bugState === 'HIDDEN' || bugState === 'DYING') return;

    if (mode === 'NINJA') {
      // Ninja dodges on hover or click attempt if not fast enough
      // But if clicked successfully (hard), it dies.
      if (type === 'HOVER') {
         setSpeech("!");
         speedRef.current = 15; // Speed boost
         const dodgeX = Math.random() * window.innerWidth;
         const dodgeY = Math.random() * window.innerHeight;
         setTargetPos({ x: dodgeX, y: dodgeY });
         targetRef.current = { x: dodgeX, y: dodgeY };
         setBugState('WALKING');
         startMovementLoop();
         
         setTimeout(() => {
            speedRef.current = 8; // Reset speed
            setSpeech(null);
         }, 1000);
         return;
      }
    }

    if (type === 'CLICK') {
      explodeBug();
    }
  };

  const explodeBug = () => {
    setBugState('DYING');
    setIsExploding(true);
    setSpeech(null);
    if (moveInterval.current) cancelAnimationFrame(moveInterval.current);
    
    // Play sound effect? (Optional)
    
    setTimeout(() => {
      setIsExploding(false);
      setBugState('HIDDEN');
      scheduleSpawn();
    }, 1000);
  };

  // Initial Spawn Timer
  useEffect(() => {
    scheduleSpawn();
    return () => {
      if (behaviorTimeout.current) clearTimeout(behaviorTimeout.current);
      if (moveInterval.current) cancelAnimationFrame(moveInterval.current);
    };
  }, [scheduleSpawn]);

  if (bugState === 'HIDDEN') return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: pos.x,
        top: pos.y,
        transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
        transition: bugState === 'WALKING' ? 'none' : 'transform 0.3s ease-out'
      }}
      onClick={() => handleInteraction('CLICK')}
      onMouseEnter={() => handleInteraction('HOVER')}
    >
      {/* Speech Bubble */}
      {speech && !isExploding && (
        <div 
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border-2 border-black px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap z-50 animate-bounce"
            style={{ transform: `rotate(-${pos.rotation}deg)` }} // Counter-rotate text
        >
            {speech}
        </div>
      )}

      {isExploding ? (
         // EXPLOSION ANIMATION (Sketch Style)
         <div className="relative w-20 h-20 flex items-center justify-center">
             <div className="absolute inset-0 animate-ping border-4 border-black rounded-full opacity-75"></div>
             <div className="absolute inset-0 animate-pulse border-2 border-slate-800 rounded-full opacity-50 scale-150"></div>
             {/* Particles */}
             {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute w-2 h-8 bg-black rounded-full" 
                     style={{ 
                         transform: `rotate(${i * 45}deg) translate(20px)`,
                         animation: 'explode-particles 0.5s ease-out forwards'
                     }} 
                />
             ))}
             <span className="font-black text-xl text-black relative z-10" style={{ transform: `rotate(-${pos.rotation}deg)` }}>POOF!</span>
         </div>
      ) : (
        // SKETCH BUG SVG
        <div className={`relative w-16 h-16 drop-shadow-xl transition-transform ${bugState === 'WALKING' ? 'animate-bug-bounce' : ''}`}>
             <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* LEGS (Animated when walking) */}
                <g className={bugState === 'WALKING' ? 'animate-leg-wiggle' : ''}>
                    <path d="M20,30 L5,20" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M80,30 L95,20" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M20,50 L2,50" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M80,50 L98,50" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M20,70 L5,85" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M80,70 L95,85" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>

                {/* BODY (Rough Sketch Circle) */}
                <path 
                    d="M50,10 C20,10 10,40 15,70 C20,95 80,95 85,70 C90,40 80,10 50,10 Z" 
                    fill="white" 
                    stroke="black" 
                    strokeWidth="3"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                />
                
                {/* STRIPES (Sketchy) */}
                <path d="M20,40 Q50,45 80,40" stroke="black" strokeWidth="2" fill="none" opacity="0.6" />
                <path d="M18,60 Q50,65 82,60" stroke="black" strokeWidth="2" fill="none" opacity="0.6" />

                {/* EYES */}
                <g transform="translate(0, 10)">
                    {/* Left Eye */}
                    <circle cx="35" cy="30" r="8" fill="white" stroke="black" strokeWidth="2" />
                    <circle 
                        cx={bugState === 'LOOKING' ? 35 : 35} 
                        cy={bugState === 'LOOKING' ? 34 : 28} 
                        r="3" 
                        fill="black" 
                        className="transition-all duration-500"
                    />

                    {/* Right Eye */}
                    <circle cx="65" cy="30" r="8" fill="white" stroke="black" strokeWidth="2" />
                    <circle 
                        cx={bugState === 'LOOKING' ? 65 : 65} 
                        cy={bugState === 'LOOKING' ? 34 : 28} 
                        r="3" 
                        fill="black" 
                        className="transition-all duration-500"
                    />
                </g>

                {/* MOUTH (Small smile) */}
                {bugState === 'LOOKING' ? (
                     <path d="M40,80 Q50,85 60,80" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
                ) : (
                     <path d="M45,80 L55,80" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
                )}

                {/* NINJA HEADBAND (If Ninja) */}
                {mode === 'NINJA' && (
                    <path d="M25,15 L75,15" stroke="red" strokeWidth="6" strokeLinecap="round" />
                )}
             </svg>
        </div>
      )}
    </div>
  );
};

export default EasterEggBug;
