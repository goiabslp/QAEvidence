
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type BugState = 'IDLE' | 'WALKING' | 'LAUGHING' | 'EXPLODING' | 'TAUNTING';
type BugVariant = 'NORMAL' | 'NINJA';

const EasterEggBug: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [rotation, setRotation] = useState(0);
  const [bugState, setBugState] = useState<BugState>('WALKING');
  const [variant, setVariant] = useState<BugVariant>('NORMAL');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Refs for animation loop
  const posRef = useRef({ x: -100, y: -100 });
  const targetRef = useRef({ x: 0, y: 0 });
  const speedRef = useRef(1); // pixels per frame
  const requestRef = useRef<number>();
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const nextSpawnTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    scheduleNextSpawn();
    
    // Blinking Interval
    const blinkInterval = setInterval(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
    }, 4000);

    return () => {
      cancelSpawn();
      clearInterval(blinkInterval);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
    };
  }, []);

  const scheduleNextSpawn = () => {
    // Random spawn time between 20s and 60s
    const delay = Math.random() * (60000 - 20000) + 20000;
    
    nextSpawnTimeoutRef.current = setTimeout(() => {
        spawnBug();
    }, delay);
  };

  const cancelSpawn = () => {
    if (nextSpawnTimeoutRef.current) clearTimeout(nextSpawnTimeoutRef.current);
  };

  const spawnBug = () => {
    const isNinja = Math.random() > 0.7; // 30% chance of ninja
    setVariant(isNinja ? 'NINJA' : 'NORMAL');
    setBugState('WALKING');
    setSpeechBubble(null);

    // Calculate start and end points outside screen
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    // Pick a side: 0: top, 1: right, 2: bottom, 3: left
    const startSide = Math.floor(Math.random() * 4);
    let startX = 0, startY = 0;
    let endX = 0, endY = 0;

    const buffer = 100;

    switch(startSide) {
        case 0: // Top
            startX = Math.random() * screenW; startY = -buffer;
            endX = Math.random() * screenW; endY = screenH + buffer;
            break;
        case 1: // Right
            startX = screenW + buffer; startY = Math.random() * screenH;
            endX = -buffer; endY = Math.random() * screenH;
            break;
        case 2: // Bottom
            startX = Math.random() * screenW; startY = screenH + buffer;
            endX = Math.random() * screenW; endY = -buffer;
            break;
        case 3: // Left
            startX = -buffer; startY = Math.random() * screenH;
            endX = screenW + buffer; endY = Math.random() * screenH;
            break;
    }

    posRef.current = { x: startX, y: startY };
    targetRef.current = { x: endX, y: endY };
    setPosition({ x: startX, y: startY });
    
    // Ninja is fast (4-7), Normal is random speed (0.5-2)
    speedRef.current = isNinja ? (Math.random() * 3 + 4) : (Math.random() * 1.5 + 0.5);

    setIsVisible(true);
    startAnimationLoop();
  };

  const startAnimationLoop = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    const animate = () => {
      if (!isVisible) return;
      
      updatePosition();
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
  };

  const updatePosition = () => {
    // If exploring, idle, laughing, or exploding, don't move x/y
    if (bugState === 'IDLE' || bugState === 'LAUGHING' || bugState === 'EXPLODING' || bugState === 'TAUNTING') {
       return;
    }

    const dx = targetRef.current.x - posRef.current.x;
    const dy = targetRef.current.y - posRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < speedRef.current) {
        // Reached destination
        despawn();
        return;
    }

    // Move
    const angle = Math.atan2(dy, dx);
    const moveX = Math.cos(angle) * speedRef.current;
    const moveY = Math.sin(angle) * speedRef.current;

    posRef.current.x += moveX;
    posRef.current.y += moveY;

    // Convert rad to deg and add 90 because SVG points up
    setRotation((angle * 180 / Math.PI) + 90);
    setPosition({ ...posRef.current });

    // Random Behavior Trigger (Only for Normal bugs)
    if (variant === 'NORMAL' && Math.random() < 0.005) { // ~0.5% chance per frame
        triggerRandomBehavior();
    }
  };

  const triggerRandomBehavior = () => {
      // Pause walking
      const behaviors: BugState[] = ['IDLE', 'LAUGHING', 'TAUNTING'];
      const chosen = behaviors[Math.floor(Math.random() * behaviors.length)];
      
      setBugState(chosen);
      
      if (chosen === 'LAUGHING') {
          setSpeechBubble(Math.random() > 0.5 ? 'Hehe...' : 'Kkkk');
      } else if (chosen === 'TAUNTING') {
          setSpeechBubble('?');
      }

      // Resume walking after 1.5-3.5 seconds
      const duration = Math.random() * 2000 + 1500;
      
      stateTimeoutRef.current = setTimeout(() => {
          setBugState('WALKING');
          setSpeechBubble(null);
      }, duration);
  };

  const despawn = () => {
    setIsVisible(false);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    scheduleNextSpawn();
  };

  const handleHover = () => {
     // NINJA DODGE MECHANIC
     // If user tries to hover over a Ninja bug walking, it dashes away
     if (variant === 'NINJA' && bugState === 'WALKING') {
         // Increase speed dramatically
         speedRef.current = speedRef.current * 2; 
         setSpeechBubble("!");
         // Briefly show !, then clear
         setTimeout(() => setSpeechBubble(null), 400);
     }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (bugState === 'EXPLODING') return;

    // Ninja bug is nearly impossible to click due to speed/dodge, but if you manage it:
    setBugState('EXPLODING');
    setSpeechBubble(null);
    
    // Remove after explosion animation
    setTimeout(() => {
        despawn();
    }, 800);
  };

  if (!isVisible) return null;

  return (
    <div 
        className="fixed z-[100] cursor-pointer"
        style={{ 
            left: position.x, 
            top: position.y, 
            transform: `rotate(${rotation}deg)`,
            transition: bugState === 'WALKING' ? 'none' : 'transform 0.2s' 
        }}
        onClick={handleClick}
        onMouseEnter={handleHover}
    >
        {/* Speech Bubble */}
        {speechBubble && bugState !== 'EXPLODING' && (
            <div 
                className="absolute -top-12 -right-12 bg-white border-2 border-slate-900 text-slate-900 text-xs font-black px-2 py-1 rounded-xl shadow-lg whitespace-nowrap z-20 animate-bounce-in"
                style={{ transform: `rotate(-${rotation}deg)` }} // Counter-rotate to keep text upright-ish
            >
                {speechBubble}
            </div>
        )}

        {bugState === 'EXPLODING' ? (
            <div className="relative w-24 h-24 -translate-x-1/2 -translate-y-1/2">
                {/* Explosion Particles */}
                <div className="absolute inset-0 animate-ping bg-yellow-400 rounded-full opacity-75"></div>
                <div className="absolute inset-0 animate-ping delay-100 bg-orange-500 rounded-full opacity-75 scale-75"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full animate-spin-fast opacity-0 animate-fade-out">
                         <X className="w-full h-full text-slate-900" />
                    </div>
                </div>
                <div className="particle-explosion"></div>
            </div>
        ) : (
            // THE BUG SVG
            <div className={`relative w-16 h-16 transition-transform ${bugState === 'LAUGHING' ? 'animate-bug-laugh' : ''} ${bugState === 'WALKING' ? 'animate-bug-bounce' : ''}`}>
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl overflow-visible">
                    {/* Legs (Animated) */}
                    <g className={`legs ${bugState === 'WALKING' || variant === 'NINJA' ? 'animate-leg-wiggle' : ''}`}>
                         {/* Left Legs */}
                         <path d="M30 40 L5 30" stroke="black" strokeWidth="4" strokeLinecap="round" />
                         <path d="M30 50 L5 50" stroke="black" strokeWidth="4" strokeLinecap="round" />
                         <path d="M30 60 L5 70" stroke="black" strokeWidth="4" strokeLinecap="round" />
                         {/* Right Legs */}
                         <path d="M70 40 L95 30" stroke="black" strokeWidth="4" strokeLinecap="round" />
                         <path d="M70 50 L95 50" stroke="black" strokeWidth="4" strokeLinecap="round" />
                         <path d="M70 60 L95 70" stroke="black" strokeWidth="4" strokeLinecap="round" />
                    </g>

                    {/* Body */}
                    <ellipse cx="50" cy="55" rx="25" ry="35" fill={variant === 'NINJA' ? '#1e1e1e' : '#4c1d95'} stroke="black" strokeWidth="2" />
                    
                    {/* Wings/Shell Split */}
                    <path d="M50 25 L50 90" stroke="black" strokeWidth="1" opacity="0.5" />
                    
                    {/* Spots (Only for Normal) */}
                    {variant === 'NORMAL' && (
                        <>
                           <circle cx="40" cy="60" r="4" fill="#ef4444" opacity="0.8" />
                           <circle cx="60" cy="45" r="3" fill="#ef4444" opacity="0.8" />
                           <circle cx="35" cy="40" r="2" fill="#ef4444" opacity="0.8" />
                        </>
                    )}
                    {variant === 'NINJA' && (
                        // Ninja Headband
                        <path d="M30 25 L70 25" stroke="red" strokeWidth="4" />
                    )}

                    {/* Head */}
                    <circle cx="50" cy="25" r="18" fill={variant === 'NINJA' ? '#000' : '#333'} stroke="black" strokeWidth="2" />

                    {/* Eyes Group */}
                    <g className="eyes">
                        {/* Sclera */}
                        <circle cx="42" cy="20" r="6" fill="white" />
                        <circle cx="58" cy="20" r="6" fill="white" />
                        
                        {/* Pupils */}
                        {/* IDLE: Look at User (Center big) | WALKING: Look Forward (Up) | TAUNTING: Look Angry */}
                        <g className={`pupils transition-all duration-300 ${bugState === 'IDLE' ? 'translate-y-0 scale-110' : '-translate-y-1'}`}>
                             <circle cx="42" cy="20" r={bugState === 'IDLE' ? 3 : 2.5} fill="black" />
                             <circle cx="58" cy="20" r={bugState === 'IDLE' ? 3 : 2.5} fill="black" />
                        </g>

                        {/* Eyelids for Blinking */}
                        {isBlinking && (
                             <g>
                                <circle cx="42" cy="20" r="6" fill={variant === 'NINJA' ? '#000' : '#333'} />
                                <circle cx="58" cy="20" r="6" fill={variant === 'NINJA' ? '#000' : '#333'} />
                             </g>
                        )}
                        
                        {/* Eyebrows for Ninja or Taunt */}
                        {(variant === 'NINJA' || bugState === 'TAUNTING') && !isBlinking && (
                             <>
                               <path d="M36 12 L48 16" stroke="black" strokeWidth="2" strokeLinecap="round" />
                               <path d="M64 12 L52 16" stroke="black" strokeWidth="2" strokeLinecap="round" />
                             </>
                        )}
                    </g>

                    {/* Mouth */}
                    <g className="mouth transition-all duration-300">
                        {bugState === 'LAUGHING' ? (
                            <path d="M40 32 Q50 42 60 32" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        ) : bugState === 'TAUNTING' ? (
                            <circle cx="50" cy="35" r="3" fill="black" />
                        ) : bugState === 'IDLE' ? (
                             // Cute small smile when looking at user
                             <path d="M45 35 Q50 38 55 35" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                        ) : (
                            <path d="M45 35 Q50 35 55 35" stroke="white" strokeWidth="1" strokeLinecap="round" />
                        )}
                    </g>
                    
                    {/* Antennae */}
                    <path d="M40 10 Q35 0 25 5" fill="none" stroke="black" strokeWidth="2" />
                    <path d="M60 10 Q65 0 75 5" fill="none" stroke="black" strokeWidth="2" />
                </svg>
            </div>
        )}
    </div>
  );
};

export default EasterEggBug;
