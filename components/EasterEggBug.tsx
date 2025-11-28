
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

type BugMode = 'NORMAL' | 'NINJA';
type BugState = 'WALKING' | 'IDLE' | 'SCARED' | 'DYING' | 'DEAD';

const EasterEggBug: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState<BugMode>('NORMAL');
  const [bugState, setBugState] = useState<BugState>('WALKING');
  const [speech, setSpeech] = useState<string | null>(null);
  
  // Refs for logic loop
  const posRef = useRef({ x: -100, y: -100 });
  const destRef = useRef({ x: 0, y: 0 });
  const speedRef = useRef(2);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopRef = useRef<number | null>(null);
  const stateRef = useRef<BugState>('WALKING'); // To sync with render state

  // Initialize Spawning Logic
  useEffect(() => {
    scheduleSpawn();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, []);

  const scheduleSpawn = () => {
    // Random time between 15s and 60s
    const time = Math.random() * 45000 + 15000;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(spawnBug, time);
  };

  const spawnBug = () => {
    // Determine start side
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    const padding = 50;
    let startX = 0, startY = 0;
    
    // Viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    switch(side) {
        case 0: startX = Math.random() * vw; startY = -padding; break;
        case 1: startX = vw + padding; startY = Math.random() * vh; break;
        case 2: startX = Math.random() * vw; startY = vh + padding; break;
        case 3: startX = -padding; startY = Math.random() * vh; break;
    }

    posRef.current = { x: startX, y: startY };
    setPosition({ x: startX, y: startY });

    // Pick new destination inside screen
    pickNewDestination();

    // Determine Mode (20% chance of Ninja)
    const isNinja = Math.random() < 0.2;
    setMode(isNinja ? 'NINJA' : 'NORMAL');
    speedRef.current = isNinja ? 6 : 2;

    setBugState('WALKING');
    stateRef.current = 'WALKING';
    setIsVisible(true);
    setSpeech(null);

    // Start Movement Loop
    startLoop();
  };

  const pickNewDestination = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 100;
    
    destRef.current = {
        x: Math.random() * (vw - padding * 2) + padding,
        y: Math.random() * (vh - padding * 2) + padding
    };
  };

  const startLoop = () => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    
    const update = () => {
        if (stateRef.current === 'DEAD' || stateRef.current === 'DYING') return;

        // Current Pos
        let { x, y } = posRef.current;
        let targetX = destRef.current.x;
        let targetY = destRef.current.y;

        // Calculate Angle
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If reached destination, pick new one or leave
        if (distance < 10) {
            // Chance to leave screen
            if (Math.random() < 0.3) {
                // Pick destination off screen
                destRef.current = {
                    x: Math.random() > 0.5 ? -100 : window.innerWidth + 100,
                    y: Math.random() * window.innerHeight
                };
            } else {
                pickNewDestination();
                // Chance to IDLE (Pause & Look)
                if (mode === 'NORMAL' && Math.random() < 0.5) {
                    enterIdleState();
                    return; // Stop loop, wait for idle to finish
                }
            }
        }

        // Move
        const angle = Math.atan2(dy, dx);
        const velocity = speedRef.current;
        
        x += Math.cos(angle) * velocity;
        y += Math.sin(angle) * velocity;

        posRef.current = { x, y };
        setPosition({ x, y });
        setRotation(angle * (180 / Math.PI) + 90); // +90 because SVG faces up

        // Check if went far off screen (despawn)
        if (x < -200 || x > window.innerWidth + 200 || y < -200 || y > window.innerHeight + 200) {
            despawn();
            return;
        }

        loopRef.current = requestAnimationFrame(update);
    };

    loopRef.current = requestAnimationFrame(update);
  };

  const enterIdleState = () => {
    setBugState('IDLE');
    stateRef.current = 'IDLE';
    
    // 50% chance to laugh/taunt
    if (Math.random() > 0.5) {
        setSpeech(Math.random() > 0.5 ? "Hehe..." : "Hum?");
        setTimeout(() => setSpeech(null), 1500);
    }

    // Resume walking after 1-3 seconds
    setTimeout(() => {
        if (stateRef.current !== 'DEAD') {
            setBugState('WALKING');
            stateRef.current = 'WALKING';
            pickNewDestination();
            startLoop();
        }
    }, Math.random() * 2000 + 1000);
  };

  const handleInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (mode === 'NINJA' && bugState !== 'DYING') {
        // Ninja dodge logic is handled in MouseEnter, but if they manage to click:
        explode();
    } else {
        explode();
    }
  };

  const handleMouseEnter = () => {
      if (mode === 'NINJA' && bugState !== 'DYING') {
          // DODGE!
          setBugState('SCARED');
          stateRef.current = 'SCARED';
          setSpeech("!");
          
          // Speed up massively
          speedRef.current = 12;

          // Run away from mouse center (approximate by just running to a random far point)
          pickNewDestination();
          
          setTimeout(() => setSpeech(null), 500);

          // Reset to walking fast after a bit
          setTimeout(() => {
              if (stateRef.current !== 'DEAD') {
                setBugState('WALKING');
                stateRef.current = 'WALKING';
                speedRef.current = 6; // Still fast
              }
          }, 1000);
      }
  };

  const explode = () => {
    setBugState('DYING');
    stateRef.current = 'DYING';
    setSpeech(null);
    if (loopRef.current) cancelAnimationFrame(loopRef.current);

    // Remove after animation
    setTimeout(() => {
        setBugState('DEAD');
        despawn();
    }, 800);
  };

  const despawn = () => {
    setIsVisible(false);
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    scheduleSpawn();
  };

  if (!isVisible) return null;

  return (
    <div 
        className="fixed z-[100] w-12 h-12 pointer-events-auto cursor-crosshair"
        style={{ 
            left: position.x, 
            top: position.y, 
            transform: `rotate(${rotation}deg)`,
            transition: mode === 'NINJA' ? 'transform 0.1s linear' : 'transform 0.2s linear' 
        }}
        onClick={handleInteraction}
        onMouseEnter={handleMouseEnter}
    >
      {/* SPEECH BUBBLE - Counter rotate to stay upright */}
      {speech && bugState !== 'DYING' && (
          <div 
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-900 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-xl shadow-md whitespace-nowrap z-20 animate-bounce-in"
            style={{ transform: `rotate(-${rotation}deg)` }}
          >
              {speech}
          </div>
      )}

      {bugState === 'DYING' ? (
          // EXPLOSION EFFECT
          <div className="relative w-full h-full flex items-center justify-center">
             <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                 {/* Splat Particles */}
                 <div className="w-2 h-2 bg-green-600 rounded-full absolute -top-4 -left-2 animate-particle-1"></div>
                 <div className="w-2 h-2 bg-green-500 rounded-full absolute top-6 -right-4 animate-particle-2"></div>
                 <div className="w-3 h-3 bg-green-700 rounded-full absolute -bottom-2 left-6 animate-particle-3"></div>
                 <X className="w-8 h-8 text-slate-800 animate-spin" />
             </div>
          </div>
      ) : (
          // THE BUG SVG
          <div className={`w-full h-full relative ${bugState === 'WALKING' || bugState === 'SCARED' ? 'animate-bug-bounce' : ''}`}>
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                  {/* LEGS (Animated via CSS) */}
                  <g className={`stroke-slate-900 stroke-[4] ${bugState === 'WALKING' ? 'animate-leg-wiggle' : bugState === 'SCARED' ? 'animate-leg-wiggle-fast' : ''}`}>
                      {/* Left Legs */}
                      <path d="M30 40 L5 30" strokeLinecap="round" />
                      <path d="M30 50 L5 50" strokeLinecap="round" />
                      <path d="M30 60 L5 70" strokeLinecap="round" />
                      {/* Right Legs */}
                      <path d="M70 40 L95 30" strokeLinecap="round" />
                      <path d="M70 50 L95 50" strokeLinecap="round" />
                      <path d="M70 60 L95 70" strokeLinecap="round" />
                  </g>

                  {/* BODY */}
                  <ellipse cx="50" cy="55" rx="25" ry="30" fill="#1e293b" /> 
                  <ellipse cx="50" cy="55" rx="20" ry="25" fill="#334155" /> 

                  {/* HEAD */}
                  <circle cx="50" cy="30" r="18" fill="#1e293b" />
                  
                  {/* NINJA HEADBAND */}
                  {mode === 'NINJA' && (
                      <path d="M32 20 L68 20 L68 28 L32 28 Z" fill="#ef4444" />
                  )}

                  {/* EYES CONTAINER */}
                  <g className={bugState === 'IDLE' ? 'animate-blink' : ''}>
                    {/* Left Eye */}
                    <circle cx="42" cy="28" r="6" fill="white" />
                    {/* Right Eye */}
                    <circle cx="58" cy="28" r="6" fill="white" />
                    
                    {/* PUPILS - Logic for looking */}
                    <g className={bugState === 'IDLE' ? 'transition-transform duration-300 translate-y-1' : ''}>
                        {/* Normal Looking */}
                        <circle cx="42" cy="28" r="2.5" fill="black" />
                        <circle cx="58" cy="28" r="2.5" fill="black" />
                    </g>
                  </g>

                  {/* MOUTH */}
                  {bugState === 'SCARED' ? (
                      <circle cx="50" cy="40" r="3" fill="black" /> // O mouth
                  ) : speech ? (
                      <path d="M45 42 Q50 45 55 42" stroke="white" strokeWidth="2" fill="none" /> // Smile
                  ) : (
                      <line x1="45" y1="42" x2="55" y2="42" stroke="white" strokeWidth="2" /> // Neutral
                  )}
              </svg>
          </div>
      )}
    </div>
  );
};

export default EasterEggBug;
