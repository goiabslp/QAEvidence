
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

type BugState = 'SPAWNING' | 'WALKING' | 'IDLE' | 'LOOKING' | 'LAUGHING' | 'SCARED' | 'FLEEING' | 'EXPLODING' | 'GONE';
type BugType = 'NORMAL' | 'NINJA';

interface Position {
  x: number;
  y: number;
  rotation: number;
}

const EasterEggBug: React.FC = () => {
  const [bugState, setBugState] = useState<BugState>('GONE');
  const [bugType, setBugType] = useState<BugType>('NORMAL');
  const [pos, setPos] = useState<Position>({ x: -100, y: -100, rotation: 0 });
  
  // Visual States
  const [mouthState, setMouthState] = useState<'SMILE' | 'OPEN' | 'O' | 'GRIN'>('SMILE');
  const [eyeState, setEyeState] = useState<'NORMAL' | 'BLINK' | 'WIDE' | 'ANGRY'>('NORMAL');
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nextMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const behaviorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Refs for movement logic to avoid stale closures in loop
  const targetPos = useRef<{x: number, y: number} | null>(null);
  const currentPos = useRef<Position>({ x: -100, y: -100, rotation: 0 });
  const speed = useRef<number>(2);

  // --- SPAWN LOGIC ---
  const spawnBug = useCallback(() => {
    // 20% Chance of Ninja
    const isNinja = Math.random() > 0.8;
    setBugType(isNinja ? 'NINJA' : 'NORMAL');
    speed.current = isNinja ? 5 : 2.5;

    // Pick random start edge
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    const buffer = 100;
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    let startX = 0, startY = 0;
    
    switch(edge) {
      case 0: startX = Math.random() * w; startY = -buffer; break;
      case 1: startX = w + buffer; startY = Math.random() * h; break;
      case 2: startX = Math.random() * w; startY = h + buffer; break;
      case 3: startX = -buffer; startY = Math.random() * h; break;
    }

    currentPos.current = { x: startX, y: startY, rotation: 0 };
    setPos(currentPos.current);
    setBugState('SPAWNING');
    setEyeState('NORMAL');
    setMouthState('SMILE');

    // Start Moving after delay
    setTimeout(() => {
      setBugState('WALKING');
      pickRandomTarget();
    }, 100);
  }, []);

  // --- GAME LOOP ---
  useEffect(() => {
    // Check for spawn every 10 seconds with small probability
    const spawnCheck = setInterval(() => {
      if (bugState === 'GONE') {
        // 10% chance to spawn if GONE every 10s (adjust for rarity)
        if (Math.random() < 0.3) { 
           spawnBug();
        }
      }
    }, 10000);

    return () => clearInterval(spawnCheck);
  }, [bugState, spawnBug]);

  // Movement Engine
  useEffect(() => {
    const loop = () => {
      if (bugState === 'WALKING' || bugState === 'FLEEING') {
        if (!targetPos.current) return;

        const dx = targetPos.current.x - currentPos.current.x;
        const dy = targetPos.current.y - currentPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 10) {
          // Reached target
          if (bugState === 'FLEEING') {
            setBugState('GONE'); // Successfully ran away
          } else {
            decideNextBehavior();
          }
        } else {
          // Move
          const angle = Math.atan2(dy, dx);
          const velocity = bugState === 'FLEEING' ? speed.current * 3 : speed.current;
          
          currentPos.current.x += Math.cos(angle) * velocity;
          currentPos.current.y += Math.sin(angle) * velocity;
          
          // Smooth rotation
          let targetRotation = angle * (180 / Math.PI) + 90; // +90 because bug art faces up
          
          // Normalize angle logic could be added here for smoother turns, simplified for now
          currentPos.current.rotation = targetRotation;

          setPos({ ...currentPos.current });
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [bugState]);

  const pickRandomTarget = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const padding = 100;
    
    targetPos.current = {
      x: padding + Math.random() * (w - padding * 2),
      y: padding + Math.random() * (h - padding * 2)
    };
  };

  const decideNextBehavior = () => {
    // Random behavior choice
    const roll = Math.random();
    
    if (roll < 0.4) {
      // Continue Walking
      pickRandomTarget();
    } else if (roll < 0.6) {
      // Idle / Look at User
      setBugState('LOOKING');
      setEyeState('NORMAL'); // Reset eyes
      
      behaviorTimeout.current = setTimeout(() => {
          // Blink
          setEyeState('BLINK');
          setTimeout(() => setEyeState('NORMAL'), 200);
          
          // After looking, maybe walk again
          setTimeout(() => {
              setBugState('WALKING');
              pickRandomTarget();
          }, 1000); // Look for 1s
      }, 500);
    } else if (roll < 0.8) {
       // Laugh or Taunt
       setBugState('LAUGHING');
       setMouthState('OPEN');
       setBubbleText(bugType === 'NINJA' ? 'Hehe!' : 'Oi!');
       
       behaviorTimeout.current = setTimeout(() => {
           setBubbleText(null);
           setMouthState('SMILE');
           setBugState('WALKING');
           pickRandomTarget();
       }, 2000);
    } else {
       // Stop for a bit
       setBugState('IDLE');
       behaviorTimeout.current = setTimeout(() => {
           setBugState('WALKING');
           pickRandomTarget();
       }, 1500);
    }
  };

  // --- INTERACTION ---
  const handleMouseEnter = () => {
    if (bugState === 'EXPLODING' || bugState === 'GONE') return;

    if (bugType === 'NINJA') {
      // Ninja Dodge!
      setBugState('SCARED');
      setEyeState('WIDE');
      setMouthState('O');
      setBubbleText('!');
      
      // Calculate flee target (opposite to center of screen usually, or away from mouse if we tracked it)
      // For simplicity, pick a random edge to run to
      const w = window.innerWidth;
      const h = window.innerHeight;
      const edges = [
          { x: -200, y: Math.random() * h }, // Left
          { x: w + 200, y: Math.random() * h }, // Right
          { x: Math.random() * w, y: -200 }, // Top
          { x: Math.random() * w, y: h + 200 } // Bottom
      ];
      // Pick furthest edge
      // Simplified: Just pick random edge
      targetPos.current = edges[Math.floor(Math.random() * edges.length)];
      
      if (behaviorTimeout.current) clearTimeout(behaviorTimeout.current);
      
      setTimeout(() => {
          setBubbleText(null);
          setBugState('FLEEING');
      }, 300); // React time
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bugState === 'GONE' || bugState === 'EXPLODING') return;
    
    // Check if Ninja evaded (handled by mouseEnter, but if clicked fast enough...)
    // Allow clicking ninja if very fast, but usually mouseenter triggers flee first.
    
    explode();
  };

  const explode = () => {
    setBugState('EXPLODING');
    setBubbleText(null);
    
    // Cleanup after animation
    setTimeout(() => {
        setBugState('GONE');
        setPos({ x: -100, y: -100, rotation: 0 });
    }, 800);
  };

  // Render Logic
  if (bugState === 'GONE') return null;

  const isMoving = bugState === 'WALKING' || bugState === 'FLEEING';
  const isLooking = bugState === 'LOOKING';
  const rotation = bugState === 'LOOKING' ? 0 : pos.rotation; // Face user (up/0) when looking

  return (
    <div 
        ref={containerRef}
        style={{ 
            position: 'fixed', 
            left: pos.x, 
            top: pos.y, 
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transition: isLooking ? 'transform 0.5s ease-out' : 'none',
            zIndex: 9999,
            pointerEvents: 'auto',
            cursor: 'pointer'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseDown={handleClick}
        className="select-none"
    >
        {/* SPEECH BUBBLE (Counter-rotate to stay upright) */}
        {bubbleText && (
            <div 
                className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-900 px-3 py-1 rounded-xl text-xs font-black shadow-lg animate-bounce-in whitespace-nowrap"
                style={{ transform: `rotate(-${rotation}deg)` }}
            >
                {bubbleText}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 border-b-0"></div>
            </div>
        )}

        {/* EXPLOSION PARTICLES */}
        {bugState === 'EXPLODING' && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-20 h-20 relative">
                     {[...Array(8)].map((_, i) => (
                         <div 
                            key={i} 
                            className="absolute w-2 h-2 bg-green-500 rounded-full animate-explode-particle"
                            style={{ 
                                transform: `rotate(${i * 45}deg) translate(0, 0)`,
                                '--angle': `${i * 45}deg`
                            } as any} 
                         />
                     ))}
                     <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75"></div>
                 </div>
             </div>
        )}
        
        {/* BUG SVG */}
        <div className={`
             relative w-16 h-16 transition-transform
             ${isMoving ? 'animate-bug-bounce' : ''}
             ${bugState === 'LAUGHING' ? 'animate-shake' : ''}
             ${bugState === 'EXPLODING' ? 'scale-150 opacity-0 transition-all duration-200' : 'scale-100'}
        `}>
             {/* LEGS - Left */}
             <div className={`absolute left-0 top-1/2 w-4 h-1 bg-slate-800 rounded-full origin-right -translate-x-3 -translate-y-2 ${isMoving ? 'animate-leg-wiggle-1' : ''}`} />
             <div className={`absolute left-0 top-1/2 w-4 h-1 bg-slate-800 rounded-full origin-right -translate-x-3 ${isMoving ? 'animate-leg-wiggle-2' : ''}`} />
             <div className={`absolute left-0 top-1/2 w-4 h-1 bg-slate-800 rounded-full origin-right -translate-x-3 translate-y-2 ${isMoving ? 'animate-leg-wiggle-3' : ''}`} />

             {/* LEGS - Right */}
             <div className={`absolute right-0 top-1/2 w-4 h-1 bg-slate-800 rounded-full origin-left translate-x-3 -translate-y-2 ${isMoving ? 'animate-leg-wiggle-1' : ''}`} />
             <div className={`absolute right-0 top-1/2 w-4 h-1 bg-slate-800 rounded-full origin-left translate-x-3 ${isMoving ? 'animate-leg-wiggle-2' : ''}`} />
             <div className={`absolute right-0 top-1/2 w-4 h-1 bg-slate-800 rounded-full origin-left translate-x-3 translate-y-2 ${isMoving ? 'animate-leg-wiggle-3' : ''}`} />

             {/* BODY */}
             <div className={`absolute inset-1 rounded-full border-2 border-slate-900 shadow-sm overflow-hidden ${bugType === 'NINJA' ? 'bg-slate-800' : 'bg-indigo-600'}`}>
                 {/* Ninja Headband */}
                 {bugType === 'NINJA' && (
                     <div className="absolute top-3 left-0 right-0 h-3 bg-red-600 z-10">
                         <div className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-20"></div>
                     </div>
                 )}
                 
                 {/* Shell Shine */}
                 <div className="absolute top-2 left-3 w-3 h-2 bg-white/20 rounded-full rotate-45"></div>
             </div>

             {/* HEAD (Eyes & Mouth) */}
             <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-8 z-20">
                 
                 {/* EYES */}
                 <div className="flex justify-center gap-1">
                     <div className={`w-3.5 h-3.5 bg-white rounded-full border border-slate-900 flex items-center justify-center overflow-hidden ${eyeState === 'BLINK' ? 'scale-y-10' : ''} transition-transform duration-100`}>
                         <div className={`w-1.5 h-1.5 bg-black rounded-full transition-all duration-300 ${isLooking ? '' : (bugType === 'NINJA' ? '-mt-1' : '')}`} />
                     </div>
                     <div className={`w-3.5 h-3.5 bg-white rounded-full border border-slate-900 flex items-center justify-center overflow-hidden ${eyeState === 'BLINK' ? 'scale-y-10' : ''} transition-transform duration-100`}>
                         <div className={`w-1.5 h-1.5 bg-black rounded-full transition-all duration-300 ${isLooking ? '' : (bugType === 'NINJA' ? '-mt-1' : '')}`} />
                     </div>
                 </div>

                 {/* MOUTH */}
                 <div className="flex justify-center mt-1">
                     {mouthState === 'SMILE' && <div className="w-4 h-2 border-b-2 border-white/80 rounded-full"></div>}
                     {mouthState === 'OPEN' && <div className="w-3 h-3 bg-red-900 rounded-full border border-white/50"></div>}
                     {mouthState === 'O' && <div className="w-2 h-2 bg-black rounded-full border border-white"></div>}
                 </div>
             </div>
        </div>
    </div>
  );
};

export default EasterEggBug;
