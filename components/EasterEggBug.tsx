import React, { useState, useEffect, useRef } from 'react';

const EasterEggBug: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: -50, y: 50 });
  const [rotation, setRotation] = useState(0);
  const [isNinja, setIsNinja] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Interaction states
  const [isLaughing, setIsLaughing] = useState(false);
  const [lookingAtUser, setLookingAtUser] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);

  const requestRef = useRef<number>(0);
  const nextPos = useRef({ x: -50, y: 50 });
  const speed = useRef(2);
  const targetAngle = useRef(0);
  
  // Timers
  const behaviorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scheduleSpawn();
    return () => {
      if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
      if (behaviorTimeout.current) clearTimeout(behaviorTimeout.current);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const scheduleSpawn = () => {
    const randomTime = Math.random() * 30000 + 10000; // 10s to 40s
    spawnTimeout.current = setTimeout(() => {
      spawnBug();
    }, randomTime);
  };

  const spawnBug = () => {
    // Determine Ninja Mode (30% chance)
    const ninja = Math.random() > 0.7;
    setIsNinja(ninja);
    speed.current = ninja ? 5 : 2;

    // Random Start Position (Off-screen)
    const side = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
    const startX = side === 1 ? window.innerWidth + 50 : side === 3 ? -50 : Math.random() * window.innerWidth;
    const startY = side === 2 ? window.innerHeight + 50 : side === 0 ? -50 : Math.random() * window.innerHeight;

    setPosition({ x: startX, y: startY });
    nextPos.current = { x: startX, y: startY };
    
    // Initial Target (Center-ish)
    const targetX = window.innerWidth / 2 + (Math.random() - 0.5) * 400;
    const targetY = window.innerHeight / 2 + (Math.random() - 0.5) * 400;
    
    targetAngle.current = Math.atan2(targetY - startY, targetX - startX);
    setRotation(targetAngle.current * (180 / Math.PI) + 90);

    setIsVisible(true);
    setIsDead(false);
    setIsPaused(false);
    setIsLaughing(false);
    setSpeech(null);

    // Start Moving
    startMoving();
    
    // Schedule Behavior Changes
    scheduleNextBehavior();
  };

  const scheduleNextBehavior = () => {
    if (isDead) return;

    const time = Math.random() * 3000 + 2000; // 2-5s action intervals
    behaviorTimeout.current = setTimeout(() => {
       const action = Math.random();
       
       if (action < 0.2) {
          // PAUSE & LOOK
          setIsPaused(true);
          setLookingAtUser(true);
          setTimeout(() => {
             setLookingAtUser(false);
             setIsPaused(false);
             scheduleNextBehavior();
          }, 1500);

       } else if (action < 0.35) {
          // LAUGH
          setIsPaused(true);
          setIsLaughing(true);
          setSpeech(Math.random() > 0.5 ? "Hehe..." : "Ops!");
          setTimeout(() => {
             setIsLaughing(false);
             setSpeech(null);
             setIsPaused(false);
             scheduleNextBehavior();
          }, 2000);

       } else {
          // CHANGE DIRECTION
          const newTargetX = Math.random() * window.innerWidth;
          const newTargetY = Math.random() * window.innerHeight;
          targetAngle.current = Math.atan2(newTargetY - nextPos.current.y, newTargetX - nextPos.current.x);
          scheduleNextBehavior();
       }
    }, time);
  };

  const startMoving = () => {
    const animate = () => {
      if (!isPaused && !isDead) {
         // Update Position
         const dx = Math.cos(targetAngle.current) * speed.current;
         const dy = Math.sin(targetAngle.current) * speed.current;

         nextPos.current.x += dx;
         nextPos.current.y += dy;

         // Boundary Check - Wrap Around or Bounce? Let's Bounce slightly
         if (nextPos.current.x < -100 || nextPos.current.x > window.innerWidth + 100 || 
             nextPos.current.y < -100 || nextPos.current.y > window.innerHeight + 100) {
             // If gone too far, kill
             setIsVisible(false);
             scheduleSpawn();
             return; 
         }

         setPosition({ ...nextPos.current });
         
         // Smooth Rotation
         const deg = targetAngle.current * (180 / Math.PI) + 90;
         setRotation(prev => {
             const delta = deg - prev;
             // Handle wrapping 360->0
             return prev + delta * 0.1;
         });
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
  };

  const handleHover = () => {
      if (isNinja && !isDead) {
          // Ninja Dodge!
          setSpeech("!");
          speed.current = 15; // Speed boost
          targetAngle.current += Math.PI + (Math.random() - 0.5); // Turn around roughly
          setTimeout(() => {
              speed.current = 5;
              setSpeech(null);
          }, 1000);
      }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDead) return;

    // Kill logic
    setIsDead(true);
    setIsPaused(true); // Stop moving
    setSpeech(null);
    
    // Explosion Effect managed by CSS/Timeout
    setTimeout(() => {
        setIsVisible(false);
        scheduleSpawn();
    }, 1000); // Time to see explosion
  };

  if (!isVisible) return null;

  return (
    <div 
        className="fixed z-[100] pointer-events-auto cursor-crosshair transition-transform will-change-transform"
        style={{ 
            left: position.x, 
            top: position.y, 
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.1s linear'
        }}
        onMouseEnter={handleHover}
        onClick={handleClick}
    >
        {isDead ? (
            // EXPLOSION GFX
            <div className="relative">
                 <div className="absolute -top-10 -left-10 w-20 h-20 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                 <div className="absolute -top-8 -left-8 w-16 h-16 bg-orange-500 rounded-full animate-pulse"></div>
                 <div className="w-0 h-0">
                    {/* Particles (Pure CSS implementation in index.html recommended, simple divs here) */}
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="absolute w-2 h-2 bg-green-500 rounded-full" 
                             style={{ 
                                 transform: `rotate(${i * 45}deg) translate(20px)`,
                                 animation: 'explode-particles 0.5s ease-out forwards'
                             }}
                        ></div>
                    ))}
                 </div>
            </div>
        ) : (
            // LIVE BUG SVG
            <div className={`relative w-12 h-16 ${!isPaused ? 'animate-bug-bounce' : ''} ${isLaughing ? 'animate-shake' : ''}`}>
                
                {/* Speech Bubble */}
                {speech && (
                    <div 
                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-900 rounded-lg px-2 py-0.5 text-xs font-bold whitespace-nowrap z-20 shadow-sm"
                        style={{ transform: `rotate(${-rotation}deg)` }} // Counter-rotate to keep text upright
                    >
                        {speech}
                    </div>
                )}

                {/* LEGS */}
                <div className={`absolute top-2 -left-2 w-4 h-1 bg-slate-800 rounded-full ${!isPaused ? 'animate-leg-wiggle' : ''}`}></div>
                <div className={`absolute top-2 -right-2 w-4 h-1 bg-slate-800 rounded-full ${!isPaused ? 'animate-leg-wiggle-reverse' : ''}`}></div>
                
                <div className={`absolute top-8 -left-3 w-5 h-1 bg-slate-800 rounded-full ${!isPaused ? 'animate-leg-wiggle-delay' : ''}`}></div>
                <div className={`absolute top-8 -right-3 w-5 h-1 bg-slate-800 rounded-full ${!isPaused ? 'animate-leg-wiggle-delay-reverse' : ''}`}></div>

                <div className={`absolute bottom-4 -left-2 w-4 h-1 bg-slate-800 rounded-full ${!isPaused ? 'animate-leg-wiggle' : ''}`}></div>
                <div className={`absolute bottom-4 -right-2 w-4 h-1 bg-slate-800 rounded-full ${!isPaused ? 'animate-leg-wiggle-reverse' : ''}`}></div>

                {/* BODY */}
                <div className="absolute inset-0 bg-slate-900 rounded-full border-2 border-slate-700 shadow-xl overflow-hidden">
                    {/* WINGS / SHELL DETAILS */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-800"></div>
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 opacity-30"></div>
                </div>
                
                {/* HEAD */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-800 rounded-full border-2 border-slate-700 z-10">
                    
                    {/* NINJA HEADBAND */}
                    {isNinja && (
                        <div className="absolute top-1 left-0 w-full h-2 bg-red-600 z-20">
                            <div className="absolute -right-2 top-0 w-4 h-1 bg-red-600 rotate-12"></div>
                            <div className="absolute -right-2 top-1 w-4 h-1 bg-red-600 -rotate-12"></div>
                        </div>
                    )}

                    {/* EYES */}
                    <div className="flex justify-between px-1.5 mt-2 relative z-20">
                        <div className="w-2.5 h-2.5 bg-white rounded-full relative overflow-hidden">
                            <div 
                                className={`w-1 h-1 bg-black rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${lookingAtUser ? 'scale-150' : ''}`}
                            ></div>
                        </div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full relative overflow-hidden">
                            <div 
                                className={`w-1 h-1 bg-black rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${lookingAtUser ? 'scale-150' : ''}`}
                            ></div>
                        </div>
                    </div>

                    {/* MOUTH (Changes on state) */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                         {isLaughing ? (
                             <div className="w-4 h-2 bg-red-900 rounded-b-full border border-red-500"></div>
                         ) : (
                             <div className="w-3 h-0.5 bg-slate-500 rounded-full"></div>
                         )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default EasterEggBug;