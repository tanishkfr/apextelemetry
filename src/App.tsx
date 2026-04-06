import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';

const C = {
  glass: 'bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-2xl',
  label: 'text-[9px] tracking-[0.25em] text-white/40 font-sans uppercase font-medium',
  value: 'font-mono text-white',
  mint: '#00FFAA',
  amber: '#F5A623',
  crimson: '#FF2A2A',
  cyan: '#00E5FF',
};

interface Telemetry {
  lap: number;
  lapProgress: number;
  gear: number;
  rpm: number;
  throttle: number;
  brake: number;
  gX: number;
  gY: number;
  speed: number;
}

const TickNumber = ({ value, className }: { value: string | number, className?: string }) => (
  <div className={`relative inline-flex overflow-hidden ${className || ''}`}>
    <AnimatePresence mode="popLayout">
      <motion.span key={value} initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        {value}
      </motion.span>
    </AnimatePresence>
  </div>
);

const NoiseOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
);

const GlassPanel = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`${C.glass} p-5 ${className}`}>
    {children}
  </div>
);

const TrackMap = ({ progress }: { progress: number }) => {
  // Simplified Monza-like path
  const pathData = "M 40 160 L 40 100 Q 40 80 60 70 L 120 40 Q 140 30 160 40 L 220 70 Q 240 80 260 70 L 280 60 Q 290 55 290 70 L 290 120 Q 290 140 270 150 L 220 170 Q 200 180 180 170 L 120 140 Q 100 130 80 140 L 60 150 Q 40 160 40 160 Z";
  
  return (
    <GlassPanel className="flex flex-col relative overflow-hidden">
      <div className={C.label}>Track Position</div>
      <div className="flex-1 relative mt-4 flex items-center justify-center">
        <svg viewBox="0 0 320 200" className="w-full h-full overflow-visible opacity-40">
          <path d={pathData} fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-full max-w-[320px] max-h-[200px]">
            <div 
              className="absolute w-3 h-3 bg-[#00E5FF] rounded-full shadow-[0_0_15px_#00E5FF] -ml-1.5 -mt-1.5"
              style={{ offsetPath: `path('${pathData}')`, offsetDistance: `${progress * 100}%` } as any}
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

const FrictionCircle = ({ gX, gY }: { gX: number, gY: number }) => {
  const [trail, setTrail] = useState<{x: number, y: number, id: number}[]>([]);
  
  useEffect(() => {
    setTrail(t => [...t.slice(-15), { x: gX, y: gY, id: Date.now() }]);
  }, [gX, gY]);

  return (
    <GlassPanel className="flex flex-col items-center justify-center relative">
      <div className={`absolute top-5 left-5 ${C.label}`}>G-Force</div>
      <div className="relative w-40 h-40 rounded-full border border-white/10 bg-white/[0.01] flex items-center justify-center mt-6">
        {/* Crosshairs */}
        <div className="absolute w-full h-[1px] bg-white/10" />
        <div className="absolute h-full w-[1px] bg-white/10" />
        {/* Concentric circles */}
        <div className="absolute w-20 h-20 rounded-full border border-white/5" />
        
        {/* Trail */}
        {trail.map((pt, i) => (
          <div 
            key={pt.id}
            className="absolute w-2 h-2 bg-[#00FFAA] rounded-full"
            style={{ 
              left: `calc(50% + ${pt.x * 40}px)`, 
              top: `calc(50% + ${pt.y * 40}px)`,
              opacity: (i + 1) / trail.length * 0.5,
              transform: 'translate(-50%, -50%) scale(0.8)'
            }}
          />
        ))}
        {/* Current Dot */}
        <motion.div 
          className="absolute w-3 h-3 bg-[#00FFAA] rounded-full shadow-[0_0_12px_#00FFAA]"
          animate={{ x: gX * 40, y: gY * 40 }}
          transition={{ type: 'spring', stiffness: 800, damping: 40 }}
        />
      </div>
      <div className="flex gap-4 mt-4 text-xs font-mono text-white/70">
        <div>X: {gX.toFixed(2)}</div>
        <div>Y: {gY.toFixed(2)}</div>
      </div>
    </GlassPanel>
  );
};

const TelemetryGauges = ({ throttle, brake, rpm, gear, speed }: Telemetry) => {
  return (
    <GlassPanel className="flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div className={C.label}>Powertrain</div>
        <div className="text-right">
          <div className="text-3xl font-mono font-light text-white flex items-baseline justify-end gap-1">
            <TickNumber value={speed} /> <span className="text-sm text-white/40">KM/H</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Gear Indicator */}
        <div className="flex flex-col items-center justify-center w-20 h-24 bg-white/[0.03] rounded-xl border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
          <div className="text-[10px] text-white/30 mb-1 font-sans">GEAR</div>
          <div className="text-4xl font-mono text-[#00E5FF] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">
            <TickNumber value={gear} />
          </div>
        </div>

        {/* RPM & Pedals */}
        <div className="flex-1 flex flex-col gap-4">
          {/* RPM */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono text-white/50">
              <span>RPM</span>
              <span><TickNumber value={rpm} /> / 12500</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#00E5FF] to-[#FF2A2A]"
                animate={{ width: `${(rpm / 12500) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
          
          {/* Pedals */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[9px] font-mono text-white/40">THR {Math.round(throttle)}%</div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div className="h-full bg-[#00FFAA]" animate={{ width: `${throttle}%` }} transition={{ duration: 0.05 }} />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="text-[9px] font-mono text-white/40">BRK {Math.round(brake)}%</div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div className="h-full bg-[#FF2A2A]" animate={{ width: `${brake}%` }} transition={{ duration: 0.05 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

const TyreDeltaGraph = () => {
  return (
    <GlassPanel className="flex flex-col flex-1 min-h-[200px] relative">
      <div className={C.label}>Predictive Tyre Delta</div>
      <div className="flex-1 mt-4 relative">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0, 255, 170, 0.4)" />
              <stop offset="100%" stopColor="rgba(0, 255, 170, 0.0)" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00FFAA" />
              <stop offset="100%" stopColor="#F5A623" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="white" strokeOpacity="0.05" strokeDasharray="2 2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeDasharray="2 2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeOpacity="0.05" strokeDasharray="2 2" />

          {/* Area */}
          <motion.path 
            d="M 0,100 L 0,60 Q 25,40 50,50 T 100,20 L 100,100 Z" 
            fill="url(#areaGrad)" 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
          />
          {/* Line */}
          <motion.path 
            d="M 0,60 Q 25,40 50,50 T 100,20" 
            fill="none" stroke="url(#lineGrad)" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>
      </div>
    </GlassPanel>
  );
};

const BoxBoxProtocol = ({ onConfirm }: { onConfirm: () => void }) => {
  const [status, setStatus] = useState<'IDLE'|'DRAGGING'|'CONFIRMED'>('IDLE');
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbWidth = 56;
  const x = useMotionValue(0);

  useEffect(() => {
    if (trackRef.current) setTrackWidth(trackRef.current.offsetWidth);
  }, []);

  const handleDragEnd = () => {
    if (status === 'CONFIRMED') return;
    const currentX = x.get();
    const max = trackWidth - thumbWidth;
    
    if (currentX / max < 0.9) {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 25 });
    } else {
      setStatus('CONFIRMED');
      animate(x, max, { duration: 0.1 });
      onConfirm();
      setTimeout(() => {
        setStatus('IDLE');
        animate(x, 0, { type: 'spring', stiffness: 200, damping: 20 });
      }, 4000);
    }
  };

  return (
    <GlassPanel className="flex flex-col gap-4">
      <div className={C.label}>Strategic Command</div>
      <div 
        className="relative h-16 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
        ref={trackRef}
      >
        <div className={`absolute inset-0 flex items-center justify-center font-sans font-bold tracking-[0.3em] text-xs pointer-events-none transition-colors duration-500 ${status === 'CONFIRMED' ? 'text-[#F5A623] drop-shadow-[0_0_8px_rgba(245,166,35,0.8)]' : 'text-white/20'}`}>
          {status === 'CONFIRMED' ? 'PIT CALL TRANSMITTED' : 'SLIDE TO BOX'}
        </div>
        
        <motion.div 
          className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#F5A623]/20 to-transparent pointer-events-none"
          style={{ width: useTransform(x, v => v + thumbWidth/2) }}
        />

        <motion.div
          className="absolute left-1 top-1 bottom-1 w-14 bg-gradient-to-b from-gray-200 to-gray-400 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-center cursor-grab active:cursor-grabbing z-10 border border-gray-500"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: 0, right: trackWidth - thumbWidth - 8 }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-1">
            <div className="w-0.5 h-4 bg-gray-500/50 rounded-full" />
            <div className="w-0.5 h-4 bg-gray-500/50 rounded-full" />
            <div className="w-0.5 h-4 bg-gray-500/50 rounded-full" />
          </div>
        </motion.div>
      </div>
    </GlassPanel>
  );
};

export default function APEXTelemetry() {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    lap: 42, lapProgress: 0, gear: 6, rpm: 10200, throttle: 85, brake: 0, gX: 0, gY: 0, speed: 245
  });
  const [isPitAmberGlow, setIsPitAmberGlow] = useState(false);

  const telRef = useRef(telemetry);

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const t = telRef.current;
      
      // Simulate driving dynamics
      let newThrottle = t.throttle + (Math.random() * 40 - 20);
      newThrottle = Math.max(0, Math.min(100, newThrottle));
      
      let newBrake = 0;
      if (newThrottle < 10) {
        newBrake = t.brake + (Math.random() * 50 - 10);
        newBrake = Math.max(0, Math.min(100, newBrake));
      }

      let newRpm = t.rpm + (newThrottle > 50 ? 200 : -300) + (Math.random() * 100 - 50);
      let newGear = t.gear;
      if (newRpm > 12000 && newGear < 8) { newGear++; newRpm = 8000; }
      if (newRpm < 7000 && newGear > 1) { newGear--; newRpm = 11000; }
      newRpm = Math.max(4000, Math.min(12500, newRpm));

      const newSpeed = Math.max(60, Math.min(340, t.speed + (newThrottle > 50 ? 1 : -2)));

      // G-Force simulation based on throttle/brake and random lateral
      const targetGy = (newThrottle > 50 ? 1.5 : newBrake > 20 ? -3.5 : 0);
      const newGy = t.gY + (targetGy - t.gY) * 0.1;
      const targetGx = Math.sin(time / 1000) * 2.5 + (Math.random() * 1 - 0.5);
      const newGx = t.gX + (targetGx - t.gX) * 0.1;

      const newProgress = (t.lapProgress + dt * 0.05) % 1;
      const newLap = t.lapProgress > 0.99 && newProgress < 0.01 ? t.lap + 1 : t.lap;

      const nextTel = {
        lap: newLap, lapProgress: newProgress, gear: newGear, rpm: newRpm,
        throttle: newThrottle, brake: newBrake, gX: newGx, gY: newGy, speed: Math.round(newSpeed)
      };

      telRef.current = nextTel;
      setTelemetry(nextTel);

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#050505] to-black text-white font-sans selection:bg-[#00E5FF]/30">
      <NoiseOverlay />
      
      {/* Global Amber Glow */}
      <AnimatePresence>
        {isPitAmberGlow && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-40 shadow-[inset_0_0_150px_rgba(245,166,35,0.15)] border-[4px] border-[#F5A623]/20"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full h-full p-6 grid grid-cols-[320px_1fr_340px] gap-6">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          <GlassPanel className="flex items-center justify-between">
            <div>
              <div className={C.label}>Session</div>
              <div className="text-2xl font-mono mt-1">Q3</div>
            </div>
            <div className="text-right">
              <div className={C.label}>Time Remaining</div>
              <div className="text-2xl font-mono mt-1 text-[#00FFAA]">04:12.8</div>
            </div>
          </GlassPanel>
          
          <TrackMap progress={telemetry.lapProgress} />
          <FrictionCircle gX={telemetry.gX} gY={telemetry.gY} />
        </div>

        {/* CENTER COLUMN */}
        <div className="flex flex-col gap-6">
          <TelemetryGauges {...telemetry} />
          <TyreDeltaGraph />
          
          {/* Sector Times */}
          <GlassPanel className="grid grid-cols-3 divide-x divide-white/10 text-center">
            <div className="px-4">
              <div className={C.label}>Sector 1</div>
              <div className="text-xl font-mono mt-2 text-[#00FFAA]">27.431</div>
            </div>
            <div className="px-4">
              <div className={C.label}>Sector 2</div>
              <div className="text-xl font-mono mt-2 text-white">38.102</div>
            </div>
            <div className="px-4">
              <div className={C.label}>Sector 3</div>
              <div className="text-xl font-mono mt-2 text-[#FF2A2A]">24.899</div>
            </div>
          </GlassPanel>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          <GlassPanel className="flex-1 flex flex-col">
            <div className={C.label}>Live Telemetry Feed</div>
            <div className="flex-1 mt-4 flex flex-col gap-2 font-mono text-[10px] text-white/60 overflow-hidden">
              <div className="flex gap-4"><span className="text-[#00E5FF]">[SYS]</span> ERS Deployment Active</div>
              <div className="flex gap-4"><span className="text-[#F5A623]">[ENG]</span> Brake bias target 54%</div>
              <div className="flex gap-4"><span className="text-white/40">[DAT]</span> Syncing packet 0x4F2A</div>
              <div className="flex gap-4"><span className="text-[#00FFAA]">[AER]</span> DRS Enabled</div>
              <div className="flex gap-4"><span className="text-white/40">[DAT]</span> Tyre core temp nominal</div>
              <div className="flex gap-4"><span className="text-[#FF2A2A]">[WRN]</span> Minor clipping Turn 4</div>
            </div>
          </GlassPanel>
          
          <BoxBoxProtocol onConfirm={() => {
            setIsPitAmberGlow(true);
            setTimeout(() => setIsPitAmberGlow(false), 4000);
          }} />
        </div>

      </div>
    </div>
  );
}
