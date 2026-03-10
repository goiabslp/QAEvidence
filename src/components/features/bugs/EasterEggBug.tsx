

import React, { useState, useEffect, useRef } from 'react';

const BUG_DIALECT = [
  "hsufojfn",
  "englodug",
  "koriugnd",
  "fwpkztr",
  "zrnolq",
  "Sigla do usuário #$%@!",
  "Console Erro",
  "Erro 500",
  "Erro 404",
  "Erro 400",
  "Erro 409",
  "Erro 502",
  "hahaha",
  "undefined",
  "null",
  "[object Object]"
];

const ACRONYM_PHRASES = [
  "Culpa do {SIGLA}, certeza.",
  "{SIGLA} testou? Duvido.",
  "Deploy do {SIGLA} = 💥",
  "Gambiarra by {SIGLA}.",
  "{SIGLA} vai quebrar a prod.",
  "Git blame: {SIGLA} 😬",
  "Na máquina do {SIGLA} roda...",
  "Dorme não, {SIGLA}!",
  "{SIGLA} + Prod = Perigo ☠️",
  "Refaz isso aí, {SIGLA}.",
  "Code review do {SIGLA}? Medo.",
  "Commit suspeito do {SIGLA}...",
  "Foco, {SIGLA}, foco!",
  "{SIGLA} fingindo que trabalha...",
  "Deu ruim, né {SIGLA}?",
  "Foi o {SIGLA} que fez isso?",
  "Rollback no código do {SIGLA}!",
  "{SIGLA}, o rei do POG."
];

interface EasterEggBugProps {
  userAcronym?: string;
  enabled?: boolean;
}

const EasterEggBug: React.FC<EasterEggBugProps> = ({ userAcronym, enabled = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [rotation, setRotation] = useState(0);
  const [isLooking, setIsLooking] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [isScared, setIsScared] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [moveDuration, setMoveDuration] = useState(0);
  
  // Smoke Effect State
  const [showSmoke, setShowSmoke] = useState(false);
  const [smokePos, setSmokePos] = useState({ x: 0, y: 0 });
  
  // Refs to manage timeouts and loops without causing re-renders
  const stateRef = useRef<'HIDDEN' | 'MOVING' | 'IDLE' | 'FLEEING'>('HIDDEN');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fleeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Ref for userAcronym to access current value inside closures
  const userAcronymRef = useRef(userAcronym);

  useEffect(() => {
    userAcronymRef.current = userAcronym;
  }, [userAcronym]);

  // Constants
  const BUG_SIZE = 36; 
  
  useEffect(() => {
    if (enabled) {
        scheduleSpawn();
    } else {
        // Cleanup if disabled
        setIsVisible(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (fleeTimeoutRef.current) clearTimeout(fleeTimeoutRef.current);
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
        stateRef.current = 'HIDDEN';
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (fleeTimeoutRef.current) clearTimeout(fleeTimeoutRef.current);
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, [enabled]); // Re-run when enabled prop changes

  const scheduleSpawn = () => {
    stateRef.current = 'HIDDEN';
    setIsVisible(false);
    setIsExploding(false);
    setIsScared(false);
    setShowSmoke(false);
    setMessage(null);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    
    // Spawn between 20 and 60 seconds (Rare appearance)
    const timeToSpawn = Math.random() * 40000 + 20000;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (fleeTimeoutRef.current) clearTimeout(fleeTimeoutRef.current);
    
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
    if (stateRef.current === 'HIDDEN' || stateRef.current === 'FLEEING' || isExploding) return;

    // Decide next action: Move or Idle
    // CHANGED: 50% chance to move, 50% chance to idle (was 70/30)
    // This makes the bug stop and look much more frequently.
    const action = Math.random() > 0.5 ? 'MOVE' : 'IDLE';

    if (action === 'MOVE') {
      stateRef.current = 'MOVING';
      setIsLooking(false);
      setMessage(null);
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);

      const padding = 100;
      const nextX = Math.random() * (window.innerWidth - padding * 2) + padding;
      const nextY = Math.random() * (window.innerHeight - padding * 2) + padding;

      const dx = nextX - pos.x;
      const dy = nextY - pos.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      setRotation(angle);
      setPos({ x: nextX, y: nextY });

      // Slow Movement: 3s to 6s duration (Slightly faster transitions to allow for more stops)
      const duration = Math.random() * 3000 + 3000;
      setMoveDuration(duration);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(moveLoop, duration);

    } else {
      stateRef.current = 'IDLE';
      setIsLooking(true);
      
      // Occasional Speech
      // > 0.3 means 70% chance to speak when stopped
      if (Math.random() > 0.3) {
        let text = "";
        const currentAcronym = userAcronymRef.current;
        
        // Priority for User Acronym (60% chance if available)
        if (currentAcronym && Math.random() > 0.4) {
             const template = ACRONYM_PHRASES[Math.floor(Math.random() * ACRONYM_PHRASES.length)];
             text = template.replace("{SIGLA}", currentAcronym);
        } else {
             text = BUG_DIALECT[Math.floor(Math.random() * BUG_DIALECT.length)];
        }

        setMessage(text);
        
        // Auto hide message after 2-3 seconds random
        const speechDuration = Math.random() * 1000 + 2000;
        
        if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = setTimeout(() => {
            setMessage(null);
        }, speechDuration);
      }

      // Idle Duration: 2.5s to 4.5s (Longer stop to read text)
      const idleDuration = Math.random() * 2000 + 2500;
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
         if (Math.random() > 0.85) {
            flee(false); // Flee naturally
         } else {
            moveLoop();
         }
      }, idleDuration);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExploding) return;

    // Cancel fleeing if clicked during tremble
    if (fleeTimeoutRef.current) clearTimeout(fleeTimeoutRef.current);

    // 50% Explode, 50% Flee
    if (Math.random() > 0.5) {
      triggerExplosion();
    } else {
      flee(true);
    }
  };

  const triggerExplosion = () => {
    // 1. Set State to Hurt/Exploding
    setIsExploding(true);
    setIsScared(false);
    setMessage(null);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    
    setMoveDuration(0); // Stop movement immediately
    
    // 2. Stay on screen "paralyzed/hurt" for 1 second
    setTimeout(() => {
      scheduleSpawn(); // Disappear and reset logic
    }, 1000);
  };

  const flee = (scared: boolean) => {
    if (isExploding) return;

    // Trigger Smoke Effect at current position before moving
    if (scared) {
        setSmokePos({ ...pos });
        setShowSmoke(true);
        setTimeout(() => setShowSmoke(false), 800); // Cleanup smoke
    }

    stateRef.current = 'FLEEING';
    setIsLooking(false);
    setIsScared(false); // Stop trembling immediately when running starts
    
    if (scared) setMessage("hsufojfn!"); // Scared noise
    else setMessage(null);
    
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);

    // Run far away logic
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    const dirX = pos.x > centerX ? 1 : -1;
    const dirY = pos.y > centerY ? 1 : -1;

    const endX = pos.x + (dirX * 1000);
    const endY = pos.y + (dirY * 1000);

    const dx = endX - pos.x;
    const dy = endY - pos.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

    setRotation(angle);
    setPos({ x: endX, y: endY });
    
    // Fast flee speed!
    setMoveDuration(600);

    setTimeout(() => {
      scheduleSpawn();
    }, 800);
  };

  const handleMouseEnter = () => {
    if (isExploding || stateRef.current === 'FLEEING' || isScared) return;
    
    // Stop current wandering movement immediately
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Phase 1: Tremble in fear
    setIsScared(true);
    stateRef.current = 'IDLE'; // Stop updating position logic
    setMoveDuration(0); // Stop CSS transition

    // Phase 2: Flee after 1 second (1000ms)
    if (fleeTimeoutRef.current) clearTimeout(fleeTimeoutRef.current);
    fleeTimeoutRef.current = setTimeout(() => {
        if (!isExploding) flee(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    // We do NOT reset isScared here. 
    // Once triggered, the bug is committed to the "Tremble -> Flee" sequence.
  };

  if (!isVisible || !enabled) return null;

  // Only tremble if scared AND not yet fleeing/exploding
  const isTrembling = isScared && !isExploding && stateRef.current !== 'FLEEING';

  // Apply leg animation only if moving AND not hurt
  const legAnim = (animName: string) => {
      if (isExploding) return ''; // Paralyzed
      if (stateRef.current === 'MOVING' || stateRef.current === 'FLEEING') return animName;
      return '';
  };

  return (
    <>
        {/* SMOKE EFFECT (Digital Dust) */}
        {showSmoke && (
            <div 
                className="fixed z-[9998] pointer-events-none"
                style={{ 
                    top: smokePos.y, 
                    left: smokePos.x,
                    width: BUG_SIZE * 3,
                    height: BUG_SIZE * 3,
                    transform: 'translate(-50%, -50%)'
                }}
            >
                <svg viewBox="0 0 100 100" fill="none" className="w-full h-full overflow-visible" shapeRendering="crispEdges">
                    {/* Generate Random Pixel Particles */}
                    {[...Array(12)].map((_, i) => (
                        <rect
                            key={i}
                            x={45 + (Math.random() * 20 - 10)} 
                            y={45 + (Math.random() * 20 - 10)}
                            width={Math.random() * 8 + 4} 
                            height={Math.random() * 8 + 4}
                            fill={i % 2 === 0 ? "black" : "transparent"}
                            stroke="black"
                            strokeWidth="2"
                            style={{
                                '--tx': `${(Math.random() - 0.5) * 150}px`,
                                '--ty': `${(Math.random() - 0.5) * 150}px`,
                                '--rot': `${Math.random() * 720}deg`,
                                animation: `pixel-dissolve 0.8s forwards ease-out`
                            } as React.CSSProperties}
                        />
                    ))}
                </svg>
            </div>
        )}

        {/* THE BUG CONTAINER (Fixed Position, No Rotation) */}
        <div 
            className="fixed z-[9999] pointer-events-none ease-in-out"
            style={{
                top: pos.y,
                left: pos.x,
                transitionProperty: 'top, left',
                // If trembling, transition is 0 to hold place. If fleeing, fast. If walking, slow.
                transitionDuration: `${isTrembling ? 0 : moveDuration}ms`,
                transitionTimingFunction: stateRef.current === 'FLEEING' ? 'ease-in' : 'linear',
            }}
        >
            {/* SPEECH BUBBLE (Outside rotation context to stay upright) */}
            {message && !isExploding && !showSmoke && (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-[10000] pointer-events-auto">
                    <div className="bg-white border-2 border-black text-black px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shadow-[3px_3px_0px_rgba(0,0,0,0.2)] animate-bounce-in font-mono relative">
                        {message}
                        {/* Triangle pointer */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-black transform rotate-45"></div>
                    </div>
                </div>
            )}

            {/* ROTATABLE INNER CONTAINER (The Bug Itself) */}
            <div 
                className="relative pointer-events-auto cursor-pointer p-12 -m-12"
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
            >
                {/* Bug SVG */}
                <div 
                    style={{ width: BUG_SIZE, height: BUG_SIZE * 1.2 }}
                    className={`relative transition-all duration-300
                    ${isTrembling ? 'animate-tremble' : (stateRef.current === 'MOVING' ? 'animate-body-wobble' : '')}
                    ${isExploding ? 'animate-hurt-shake' : ''}
                    `}
                >
                    <svg viewBox="-20 -20 80 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm overflow-visible">
                        
                        {isExploding && (
                            <g className="animate-blast">
                                <path 
                                    d="M20 -15 L25 0 L35 -10 L30 5 L45 5 L30 15 L45 25 L30 25 L40 40 L25 30 L20 45 L15 30 L0 40 L10 25 L-5 25 L10 15 L-5 5 L10 5 L5 -10 L15 0 Z" 
                                    fill="#ffe100" 
                                    stroke="black" 
                                    strokeWidth="2" 
                                />
                                <text x="20" y="20" fontSize="12" fontWeight="bold" textAnchor="middle" fill="black" style={{fontFamily: 'sans-serif'}}>POW!</text>
                            </g>
                        )}

                        <g>
                            {/* Legs */}
                            <path d="M5 20L-4 15" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={legAnim("animate-leg-left-1")} />
                            <path d="M35 20L44 15" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={legAnim("animate-leg-right-1")} />
                            <path d="M5 30L-6 30" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={legAnim("animate-leg-left-2")} />
                            <path d="M35 30L46 30" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={legAnim("animate-leg-right-2")} />
                            <path d="M8 38L-2 44" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={legAnim("animate-leg-left-3")} />
                            <path d="M32 38L42 44" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={legAnim("animate-leg-right-3")} />

                            {/* Body */}
                            <ellipse cx="20" cy="28" rx="10" ry="14" fill={isExploding ? "#fee2e2" : "white"} stroke={isExploding ? "red" : "black"} strokeWidth="2.5" />
                            
                            {/* Bandage (Hurt State) */}
                            {isExploding && (
                                <path d="M15 24 L25 32 M25 24 L15 32" stroke="red" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                            )}
                            
                            {/* Head/Antenna Group */}
                            <g 
                                className={`transition-transform duration-150 origin-center ${isScared ? 'scale-150' : (isLooking ? 'scale-125' : 'scale-100')}`}
                                style={{ transformOrigin: '20px 14px' }}
                            >
                                <path d="M14 8L8 -2" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={isExploding ? '' : "animate-antenna"} />
                                <path d="M26 8L32 -2" stroke={isExploding ? "red" : "black"} strokeWidth="2" strokeLinecap="round" className={isExploding ? '' : "animate-antenna-alt"} />
                                
                                {/* Eye Backgrounds */}
                                <circle cx="12" cy="14" r="7.5" fill="white" stroke={isExploding ? "red" : "black"} strokeWidth="2.5" />
                                <circle cx="28" cy="14" r="7.5" fill="white" stroke={isExploding ? "red" : "black"} strokeWidth="2.5" />

                                {/* Eyes (Normal vs Dead) */}
                                {!isExploding ? (
                                    <>
                                        <circle cx={isLooking && !isScared ? 12 : 12 + (Math.random() - 0.5) * 2} cy={isLooking && !isScared ? 14 : 13} r={isScared ? 2 : 2.5} fill="black" />
                                        <circle cx={isLooking && !isScared ? 28 : 28 + (Math.random() - 0.5) * 2} cy={isLooking && !isScared ? 14 : 13} r={isScared ? 2 : 2.5} fill="black" />
                                    </>
                                ) : (
                                    <g stroke="red" strokeWidth="2" strokeLinecap="round">
                                        {/* Left X */}
                                        <path d="M9 11 L15 17" />
                                        <path d="M15 11 L9 17" />
                                        {/* Right X */}
                                        <path d="M25 11 L31 17" />
                                        <path d="M31 11 L25 17" />
                                    </g>
                                )}
                            </g>
                        </g>
                    </svg>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes body-wobble {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(3deg); }
                    75% { transform: rotate(-3deg); }
                }
                .animate-body-wobble { animation: body-wobble 0.6s infinite ease-in-out; }

                @keyframes tremble {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -1px) rotate(-1deg); }
                    20% { transform: translate(-2px, 0px) rotate(1deg); }
                    30% { transform: translate(2px, 1px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 1px) rotate(-1deg); }
                    60% { transform: translate(-2px, 1px) rotate(0deg); }
                    70% { transform: translate(2px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 1px) rotate(0deg); }
                    100% { transform: translate(1px, -1px) rotate(-1deg); }
                }
                .animate-tremble { animation: tremble 0.08s infinite linear; }
                
                @keyframes hurt-shake {
                    0% { transform: translate(0, 0) scale(1.1); }
                    10% { transform: translate(-3px, 0) scale(1.1); }
                    20% { transform: translate(3px, 0) scale(1.1); }
                    30% { transform: translate(-3px, 0) scale(1.1); }
                    40% { transform: translate(3px, 0) scale(1.1); }
                    50% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(0, 0) scale(1); }
                }
                .animate-hurt-shake { animation: hurt-shake 0.4s forwards ease-out; transform-origin: 20px 20px; }

                @keyframes blast-pop {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
                .animate-blast { animation: blast-pop 0.6s forwards ease-out; transform-origin: 20px 20px; }

                @keyframes pixel-dissolve {
                    0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0); opacity: 0; }
                }

                @keyframes leg-wiggle {
                    0%, 100% { transform: rotate(-15deg); }
                    50% { transform: rotate(15deg); }
                }
                .animate-leg-left-1 { animation: leg-wiggle 0.5s infinite ease-in-out; transform-origin: 5px 20px; }
                .animate-leg-right-2 { animation: leg-wiggle 0.5s infinite ease-in-out; transform-origin: 35px 30px; }
                .animate-leg-left-3 { animation: leg-wiggle 0.5s infinite ease-in-out; transform-origin: 8px 38px; }
                .animate-leg-right-1 { animation: leg-wiggle 0.5s infinite reverse ease-in-out; transform-origin: 35px 20px; }
                .animate-leg-left-2 { animation: leg-wiggle 0.5s infinite reverse ease-in-out; transform-origin: 5px 30px; }
                .animate-leg-right-3 { animation: leg-wiggle 0.5s infinite reverse ease-in-out; transform-origin: 32px 38px; }

                @keyframes antenna-twitch {
                    0%, 100% { transform: rotate(-8deg); }
                    50% { transform: rotate(8deg); }
                }
                .animate-antenna { animation: antenna-twitch 2s infinite ease-in-out; transform-origin: 14px 8px; }
                .animate-antenna-alt { animation: antenna-twitch 2.5s infinite reverse ease-in-out; transform-origin: 26px 8px; }

                @keyframes bounce-in {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}} />
    </div>
  </>
  );
};

export default EasterEggBug;