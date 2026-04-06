import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';

const C = {
  bgVoid:    'bg-[#050505]',
  bgSurface: 'bg-[#0D0F10]',
  bgRaise:   'bg-[#141618]',
  border:    'border-white/[0.06]',
  borderHi:  'border-white/[0.12]',

  textPrimary:   'text-[#ECEEF0]',
  textSecondary: 'text-[#8A9099]',
  textDim:       'text-[#404548]',

  mint:    '#00FFAA',
  amber:   '#F5A623',
  crimson: '#FF2A2A',
} as const;

interface RaceState {
  lap: number;
  lapProgress: number;
  flag: 'GREEN'|'YELLOW'|'SAFETY_CAR';
  trackTemp: number;
  airTemp: number;

  tyreCompound: 'S'|'M'|'H';
  tyreLapsOld: number;
  tyreWear: number;
  tyreDegPerLap: number;

  currentLapTime: number;
  bestLapTime: number;
  sectorTimes: [number, number, number];
  sectorDeltas: [number, number, number];

  fuelKg: number;
  fuelTarget: number;
  ersPercent: number;

  gapToLeader: number;
  gapDelta: number;

  optimalPitLap: number;
  pitWindowOpen: boolean;

  deltaHistory: number[];

  radioLog: Array<{
    id: number;
    from: 'ENG'|'DRIVER';
    text: string;
  }>;
}

function pointsToPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]},${pts[0][1]}`;
  
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i === 0 ? pts[0] : pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i + 2 < pts.length ? pts[i + 2] : p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const TickNumber = ({ value, className }: { value: string | number, className?: string }) => (
  <div className={`relative inline-flex overflow-hidden ${className || ''}`}>
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </div>
);

const TyreDeltaGraph = ({ race }: { race: RaceState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(680);
  const height = 220;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const LAP_START = 30;
  const LAP_END = 57;
  const DELTA_MIN = -0.5;
  const DELTA_MAX = 3.5;

  const xScale = (lap: number) => ((lap - LAP_START) / (LAP_END - LAP_START)) * width;
  const yScale = (d: number) => height - ((d - DELTA_MIN) / (DELTA_MAX - DELTA_MIN)) * height;

  const currentPts: [number, number][] = [];
  const freshPts: [number, number][] = [];

  for (let lap = LAP_START; lap <= LAP_END; lap++) {
    const currentDelta = race.tyreDegPerLap * (race.tyreLapsOld + (lap - race.lap));
    currentPts.push([xScale(lap), yScale(currentDelta)]);

    if (lap < race.optimalPitLap) {
      freshPts.push([xScale(lap), yScale(currentDelta)]);
    } else {
      const freshDelta = race.tyreDegPerLap * (lap - race.optimalPitLap) * 0.65;
      freshPts.push([xScale(lap), yScale(freshDelta)]);
    }
  }

  const currentPath = pointsToPath(currentPts);
  const freshPath = pointsToPath(freshPts);

  const ix = xScale(race.optimalPitLap);
  const iy = yScale(0);

  const [hoverLap, setHoverLap] = useState<number | null>(null);

  return (
    <div className={`flex flex-col ${C.bgSurface} ${C.border} rounded-sm p-4 relative flex-1 min-h-[260px]`}>
      <div className={`text-[10px] ${C.textSecondary} tracking-widest mb-2`}>PREDICTIVE TYRE DELTA</div>
      <div className="relative flex-1" ref={containerRef}>
        <svg width="100%" height="100%" className="absolute inset-0 overflow-visible">
          <defs>
            <filter id="amberGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="mintGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {[0, 1, 2, 3].map(d => (
            <line key={d} x1={0} x2={width} y1={yScale(d)} y2={yScale(d)} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
          ))}

          <rect 
            x={xScale(35)} 
            width={xScale(41) - xScale(35)} 
            y={0} height={height} 
            fill="rgba(0,255,170,0.06)" 
          />
          <text x={xScale(35) + 4} y={12} fill={C.mint} fontSize="9" opacity={0.5} className="font-sans">PIT WINDOW</text>

          <motion.line 
            x1={xScale(race.lap + race.lapProgress)} x2={xScale(race.lap + race.lapProgress)} 
            y1={0} y2={height} 
            stroke={C.mint} strokeWidth={1} opacity={0.5}
          />

          <motion.path 
            d={currentPath} stroke={C.amber} strokeWidth={1.5} fill="none" filter="url(#amberGlow)"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          <motion.path 
            d={freshPath} stroke={C.mint} strokeWidth={1.5} fill="none" filter="url(#mintGlow)"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          <motion.circle cx={ix} cy={iy} r={4} fill={C.mint} />
          <motion.circle cx={ix} cy={iy} fill="none" stroke={C.mint} strokeWidth={1}
            animate={{ r: [4, 14], opacity: [0.8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        </svg>

        <div 
          className="absolute inset-0"
          onMouseMove={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            const lap = Math.round(LAP_START + (x / width) * (LAP_END - LAP_START));
            setHoverLap(Math.max(LAP_START, Math.min(LAP_END, lap)));
          }}
          onMouseLeave={() => setHoverLap(null)}
        />

        <AnimatePresence>
          {hoverLap !== null && (
            <motion.div 
              className={`absolute ${C.bgRaise} ${C.borderHi} rounded-sm p-2 font-['JetBrains_Mono'] text-[11px] pointer-events-none z-10`}
              style={{ left: xScale(hoverLap), top: yScale(race.tyreDegPerLap * (race.tyreLapsOld + (hoverLap - race.lap))) - 40, x: '-50%' }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <div style={{ color: C.amber }}>CUR: +{(race.tyreDegPerLap * (race.tyreLapsOld + (hoverLap - race.lap))).toFixed(3)}s</div>
              <div style={{ color: C.mint }}>
                NEW: +{(hoverLap < race.optimalPitLap ? race.tyreDegPerLap * (race.tyreLapsOld + (hoverLap - race.lap)) : race.tyreDegPerLap * (hoverLap - race.optimalPitLap) * 0.65).toFixed(3)}s
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={`flex justify-between mt-2 text-[10px] ${C.textSecondary}`}>
        <span>L30</span><span>L35</span><span>L40</span><span>L45</span><span>L50</span><span>L55</span>
      </div>
    </div>
  );
};

const SectorStrip = ({ race }: { race: RaceState }) => {
  return (
    <div className={`grid grid-cols-3 divide-x divide-white/[0.06] ${C.bgSurface} ${C.border} rounded-sm`}>
      {[0, 1, 2].map(i => {
        const time = race.sectorTimes[i];
        const delta = race.sectorDeltas[i];
        const isFaster = delta < 0;
        return (
          <div key={i} className="p-3 flex flex-col items-center justify-center">
            <div className={`text-[10px] ${C.textSecondary} tracking-widest mb-1`}>S{i + 1}</div>
            <TickNumber value={time.toFixed(3)} className="text-lg font-['JetBrains_Mono']" />
            <TickNumber 
              value={(isFaster ? '' : '+') + delta.toFixed(3)} 
              className={`text-xs font-['JetBrains_Mono'] ${isFaster ? 'text-[#00FFAA]' : 'text-[#FF2A2A]'}`} 
            />
          </div>
        );
      })}
    </div>
  );
};

const PedalTrace = ({ throttle, brake }: { throttle: number, brake: number }) => {
  return (
    <div className={`flex flex-col gap-2 ${C.bgSurface} ${C.border} rounded-sm p-4`}>
      <div className="flex items-center gap-3">
        <div className={`w-6 text-[10px] ${C.textSecondary}`}>THR</div>
        <div className="flex-1 h-[6px] bg-[#141618] rounded-sm overflow-hidden">
          <motion.div 
            className="h-full bg-[#00FFAA]" 
            animate={{ width: `${throttle}%` }} 
            transition={{ duration: 0.05, ease: 'linear' }} 
          />
        </div>
        <div className={`w-10 text-right text-xs font-['JetBrains_Mono'] text-[#00FFAA]`}>{Math.round(throttle)}%</div>
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-6 text-[10px] ${C.textSecondary}`}>BRK</div>
        <div className="flex-1 h-[6px] bg-[#141618] rounded-sm overflow-hidden">
          <motion.div 
            className="h-full bg-[#FF2A2A]" 
            animate={{ width: `${brake}%` }} 
            transition={{ duration: 0.05, ease: 'linear' }} 
          />
        </div>
        <div className={`w-10 text-right text-xs font-['JetBrains_Mono'] text-[#FF2A2A]`}>{Math.round(brake)}%</div>
      </div>
    </div>
  );
};

const DeltaHistory = ({ history, gapToLeader, gapDelta }: { history: number[], gapToLeader: number, gapDelta: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(200);
  const height = 40;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const min = Math.min(...history) - 0.1;
  const max = Math.max(...history) + 0.1;
  
  const pts: [number, number][] = history.map((val, i) => [
    (i / (history.length - 1 || 1)) * width,
    height - ((val - min) / (max - min)) * height
  ]);

  const path = pointsToPath(pts);
  const isClosing = gapDelta <= 0;
  const color = isClosing ? C.mint : C.amber;

  return (
    <div className={`flex flex-col ${C.bgSurface} ${C.border} rounded-sm p-4`}>
      <div className={`text-[10px] ${C.textSecondary} tracking-widest mb-3`}>DELTA TO P1 — LAST 8 LAPS</div>
      <div className="relative w-full h-[40px]" ref={containerRef}>
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <filter id="historyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path d={path} stroke={color} strokeWidth={1} fill="none" filter="url(#historyGlow)" />
          {pts.length > 0 && (
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={color} />
          )}
        </svg>
      </div>
      <div className={`mt-2 font-['JetBrains_Mono'] text-sm flex items-center gap-2`}>
        <TickNumber value={gapToLeader.toFixed(3)} />s
        <span className={color === C.mint ? 'text-[#00FFAA]' : 'text-[#F5A623]'}>
          {gapDelta > 0 ? '▲' : '▼'} {Math.abs(gapDelta).toFixed(3)}
        </span>
      </div>
    </div>
  );
};

const RadioComms = ({ log }: { log: RaceState['radioLog'] }) => {
  return (
    <div className={`flex flex-col flex-1 ${C.bgSurface} ${C.border} rounded-sm p-4 overflow-hidden`}>
      <div className={`text-[10px] ${C.textSecondary} tracking-widest mb-4`}>RADIO COMMS</div>
      <div className="flex flex-col justify-end flex-1 gap-2">
        <AnimatePresence initial={false}>
          {log.map((msg, i) => {
            const isEng = msg.from === 'ENG';
            const badgeBorder = isEng ? 'border-[#00FFAA]/40' : 'border-[#F5A623]/40';
            const badgeText = isEng ? 'text-[#00FFAA]' : 'text-[#F5A623]';
            const badgeBg = isEng ? 'bg-[#00FFAA]/5' : 'bg-[#F5A623]/5';
            
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: 12, height: 0 }}
                animate={{ opacity: i === log.length - 1 ? 1 : 0.3, x: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-2 font-['JetBrains_Mono'] text-[11px]"
              >
                <div className={`px-1.5 py-0.5 border rounded-sm ${badgeBorder} ${badgeText} ${badgeBg}`}>
                  {msg.from}
                </div>
                <div className="text-[#ECEEF0] leading-relaxed pt-0.5">{msg.text}</div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

const BoxBoxProtocol = ({ race, onConfirm }: { race: RaceState, onConfirm: () => void }) => {
  const [status, setStatus] = useState<'IDLE'|'DRAGGING'|'CONFIRMED'|'TRANSMITTED'>('IDLE');
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbWidth = 48;
  const x = useMotionValue(0);

  useEffect(() => {
    if (trackRef.current) {
      setTrackWidth(trackRef.current.offsetWidth);
    }
  }, []);

  const handleDrag = () => {
    if (status === 'TRANSMITTED') return;
    setStatus('DRAGGING');
  };

  const handleDragEnd = () => {
    if (status === 'TRANSMITTED') return;
    const currentX = x.get();
    const max = trackWidth - thumbWidth;
    const ratio = currentX / max;

    if (ratio < 0.92) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      const shake = async () => {
        await animate(x, -4, { duration: 0.05 });
        await animate(x, 4, { duration: 0.05 });
        await animate(x, -3, { duration: 0.05 });
        await animate(x, 3, { duration: 0.05 });
        await animate(x, 0, { duration: 0.05 });
      };
      shake();
      setStatus('IDLE');
    } else {
      setStatus('CONFIRMED');
      animate(x, max, { duration: 0.1 }).then(() => {
        setStatus('TRANSMITTED');
        onConfirm();
        setTimeout(() => {
          setStatus('IDLE');
          x.set(0);
        }, 3000);
      });
    }
  };

  const pulseAnim = race.pitWindowOpen && status !== 'TRANSMITTED' ? {
    boxShadow: ['inset 0 0 0px rgba(0,255,170,0)', 'inset 0 0 10px rgba(0,255,170,0.2)', 'inset 0 0 0px rgba(0,255,170,0)']
  } : {};

  return (
    <div className="flex flex-col gap-3">
      <motion.div 
        className={`relative h-[60px] ${C.bgSurface} border rounded-sm flex items-center justify-center overflow-hidden`}
        animate={status === 'TRANSMITTED' 
          ? { 
              borderColor: ['rgba(0,255,170,0.3)', 'rgba(0,255,170,1)', 'rgba(0,255,170,0.3)', 'rgba(0,255,170,1)', 'rgba(0,255,170,0.3)'],
            } 
          : { ...pulseAnim, borderColor: race.pitWindowOpen ? 'rgba(0,255,170,0.4)' : 'rgba(255,42,42,0.4)' }
        }
        transition={status === 'TRANSMITTED' ? { duration: 1.5 } : { duration: 2, repeat: Infinity }}
      >
        {status === 'TRANSMITTED' ? (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className={`font-sans font-bold text-[#00FFAA] tracking-widest text-sm`}
          >
            TRANSMITTED ✓
          </motion.div>
        ) : (
          <>
            <div className={`absolute inset-0 flex items-center justify-center font-sans font-bold tracking-widest text-sm ${race.pitWindowOpen ? 'text-[#00FFAA]/50' : 'text-[#FF2A2A]/50'} pointer-events-none`}>
              INITIATE PIT CALL
            </div>
            <div className="absolute inset-x-2 inset-y-2" ref={trackRef}>
              <motion.div
                className="absolute top-0 bottom-0 bg-[#141618] border border-white/[0.12] rounded-sm flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                style={{ width: thumbWidth, x }}
                drag="x"
                dragConstraints={{ left: 0, right: trackWidth - thumbWidth }}
                dragElastic={0}
                dragMomentum={false}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A9099" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7"></polyline>
                  <polyline points="6 17 11 12 6 7"></polyline>
                </svg>
              </motion.div>
              <motion.div 
                className="absolute top-0 bottom-0 left-0 bg-[#00FFAA]/10 rounded-sm pointer-events-none"
                style={{ width: useTransform(x, v => v + thumbWidth/2) }}
              />
            </div>
          </>
        )}
      </motion.div>

      <div className={`flex flex-col gap-1 font-['JetBrains_Mono'] text-[10px] ${C.textSecondary} px-1`}>
        <div className="flex justify-between">
          <span>UNDERCUT DELTA</span>
          <span className="text-[#ECEEF0]">+{ (race.tyreDegPerLap * (race.optimalPitLap - race.lap) * 1.2).toFixed(3) }s</span>
        </div>
        <div className="flex justify-between">
          <span>FRESH SET ETA</span>
          <span className="text-[#ECEEF0]">LAP {race.optimalPitLap + 1}</span>
        </div>
        <div className="flex justify-between">
          <span>EST. POSITION</span>
          <span className="text-[#ECEEF0]">P4 → P6 → P4*</span>
        </div>
      </div>
    </div>
  );
};

const RADIO_POOL = [
  { from: 'ENG',    text: 'Pace nominal. Push S2 hard.' },
  { from: 'DRIVER', text: 'Understeer turn 7, quite bad.' },
  { from: 'ENG',    text: 'Gap closing. Maintain delta.' },
  { from: 'DRIVER', text: 'Copy. Brake bias +1?' },
  { from: 'ENG',    text: 'Box window lap 35. Confirm?' },
  { from: 'DRIVER', text: 'Traffic S1. Lost two tenths.' },
  { from: 'ENG',    text: 'Tyre temp good. Stay out.' },
  { from: 'DRIVER', text: 'Rear feeling loose in slow.' },
] as const;

export default function APEXTelemetry() {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [pitConfirmed, setPitConfirmed] = useState(false);

  const raceRef = useRef<RaceState>({
    lap: 34,
    lapProgress: 0.4,
    flag: 'GREEN',
    trackTemp: 42.1,
    airTemp: 28.4,
    tyreCompound: 'M',
    tyreLapsOld: 18,
    tyreWear: 67,
    tyreDegPerLap: 0.043,
    currentLapTime: 73.454,
    bestLapTime: 73.209,
    sectorTimes: [22.431, 31.819, 19.204],
    sectorDeltas: [-0.041, +0.183, -0.009],
    fuelKg: 42.3,
    fuelTarget: 42.5,
    ersPercent: 78,
    gapToLeader: 4.821,
    gapDelta: -0.012,
    optimalPitLap: 38,
    pitWindowOpen: false,
    deltaHistory: [4.88, 4.86, 4.85, 4.89, 4.87, 4.84, 4.83, 4.821],
    radioLog: [
      { id: 1, from: 'ENG', text: 'Radio check.' },
      { id: 2, from: 'DRIVER', text: 'Loud and clear.' },
      { id: 3, from: 'ENG', text: 'Tyres look good, keep pushing.' },
      { id: 4, from: 'DRIVER', text: 'Copy.' },
    ]
  });

  const [race, setRace] = useState<RaceState>(raceRef.current);

  const pedalRef = useRef({ throttle: 87, brake: 0 });
  const [pedals, setPedals] = useState({ throttle: 87, brake: 0 });

  const lastCommitTime = useRef(performance.now());
  const commitCount = useRef(0);
  const radioIndex = useRef(0);

  useEffect(() => {
    let rafId: number;
    
    const loop = (time: number) => {
      const t = pedalRef.current.throttle;
      const b = pedalRef.current.brake;
      
      let newT = t + (Math.random() * 20 - 10);
      if (newT > 100) newT = 100;
      if (newT < 0) newT = 0;
      
      let newB = 0;
      if (newT < 20) {
        newB = b + (Math.random() * 40 - 10);
        if (newB > 100) newB = 100;
        if (newB < 0) newB = 0;
      }
      
      pedalRef.current = { throttle: newT, brake: newB };
      setPedals({ throttle: newT, brake: newB });

      if (time - lastCommitTime.current >= 900) {
        lastCommitTime.current = time;
        commitCount.current += 1;
        
        const r = { ...raceRef.current };
        
        r.lapProgress += 1 / 12;
        if (r.lapProgress >= 1) {
          r.lapProgress = 0;
          if (r.lap < 57) {
            r.lap += 1;
            r.tyreLapsOld += 1;
            r.tyreDegPerLap += 0.001;
          }
        }

        const flagCycle = commitCount.current % 25;
        r.flag = flagCycle < 20 ? 'GREEN' : 'YELLOW';

        r.trackTemp += (Math.random() * 0.2 - 0.1);
        r.airTemp += (Math.random() * 0.2 - 0.1);

        r.tyreWear = Math.min(100, r.tyreWear + 0.5);
        r.fuelKg = Math.max(0, r.fuelKg - 0.20);
        r.ersPercent = Math.max(60, Math.min(100, r.ersPercent + (Math.random() * 4 - 2)));

        const gapChange = (Math.random() * 0.1 - 0.05);
        r.gapDelta = gapChange;
        r.gapToLeader = Math.max(0, r.gapToLeader + gapChange);
        
        r.deltaHistory = [...r.deltaHistory.slice(1), r.gapToLeader];
        r.pitWindowOpen = r.lap >= 35 && r.lap <= 41;

        if (commitCount.current % 4 === 0) {
          const nextMsg = RADIO_POOL[radioIndex.current % RADIO_POOL.length];
          radioIndex.current += 1;
          r.radioLog = [...r.radioLog.slice(1), { id: Date.now(), from: nextMsg.from, text: nextMsg.text }];
        }

        r.sectorDeltas = [
          r.sectorDeltas[0] + (Math.random() * 0.04 - 0.02),
          r.sectorDeltas[1] + (Math.random() * 0.04 - 0.02),
          r.sectorDeltas[2] + (Math.random() * 0.04 - 0.02),
        ];

        raceRef.current = r;
        setRace(r);
      }
      
      rafId = requestAnimationFrame(loop);
    };
    
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleConfirmPit = () => {
    setPitConfirmed(true);
    
    const r = { ...raceRef.current };
    r.radioLog = [...r.radioLog.slice(1), { id: Date.now(), from: 'ENG', text: 'Box box. Box box. Pit this lap.' }];
    raceRef.current = r;
    setRace(r);

    setTimeout(() => {
      setPitConfirmed(false);
    }, 4000);
  };

  return (
    <motion.div 
      className={`w-screen h-screen overflow-hidden grid grid-cols-[200px_1fr_280px] ${C.bgVoid} text-[#ECEEF0] font-sans`}
      animate={pitConfirmed ? {
        boxShadow: [
          'inset 0 0 0px #00FFAA00',
          'inset 0 0 30px #00FFAA40',
          'inset 0 0 0px #00FFAA00',
        ]
      } : { boxShadow: 'inset 0 0 0px #00FFAA00' }}
      transition={{ duration: 0.8, repeat: pitConfirmed ? 3 : 0 }}
      onMouseLeave={() => setHoveredZone(null)}
    >
      {/* LEFT RAIL */}
      <motion.div 
        className="p-4 overflow-hidden border-r border-white/[0.06] flex flex-col gap-5"
        onMouseEnter={() => setHoveredZone('left')}
        animate={{ opacity: hoveredZone && hoveredZone !== 'left' ? 0.25 : 1 }}
        transition={{ duration: 0.08 }}
      >
        <div className="text-[11px] tracking-[0.3em] text-[#00FFAA] uppercase">APEX</div>
        
        <div className={`flex flex-col gap-3 ${C.bgSurface} ${C.border} rounded-sm p-4`}>
          <div className={`text-[10px] ${C.textSecondary} tracking-widest`}>RACE STATUS</div>
          <div className="flex justify-between items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-lg text-[#8A9099]">L</span>
              <TickNumber value={race.lap} className="text-[22px] font-['JetBrains_Mono'] leading-none" />
              <span className="text-sm text-[#8A9099] font-['JetBrains_Mono']">/57</span>
            </div>
            <motion.div 
              className="px-2 py-0.5 rounded-sm text-[11px] font-bold tracking-wider border"
              animate={{
                borderColor: race.flag === 'GREEN' ? '#00FFAA' : '#F5A623',
                color: race.flag === 'GREEN' ? '#00FFAA' : '#F5A623',
                backgroundColor: race.flag === 'GREEN' ? 'rgba(0,255,170,0.1)' : 'rgba(245,166,35,0.1)'
              }}
              transition={{ duration: 0.3 }}
            >
              {race.flag === 'SAFETY_CAR' ? '● SC' : race.flag}
            </motion.div>
          </div>
          <div className="h-[3px] bg-[#141618] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#00FFAA]"
              animate={{ width: `${race.lapProgress * 100}%` }}
              transition={{ duration: 0.9, ease: 'linear' }}
            />
          </div>
          <div className={`flex justify-between text-[11px] ${C.textSecondary} mt-1`}>
            <span className="flex gap-1">TRACK <TickNumber value={race.trackTemp.toFixed(1)} />°C</span>
            <span className="flex gap-1">AIR <TickNumber value={race.airTemp.toFixed(1)} />°C</span>
          </div>
        </div>

        <div className={`flex flex-col gap-3 ${C.bgSurface} ${C.border} rounded-sm p-4`}>
          <div className={`text-[10px] ${C.textSecondary} tracking-widest`}>TYRE DATA</div>
          <div className="flex justify-between items-center">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${race.tyreCompound === 'M' ? 'border-[#F5A623] text-[#F5A623]' : race.tyreCompound === 'S' ? 'border-[#FF2A2A] text-[#FF2A2A]' : 'border-white text-white'}`}>
              {race.tyreCompound}
            </div>
            <div className="font-['JetBrains_Mono'] text-sm flex gap-1">
              <TickNumber value={race.tyreLapsOld} /> LAPS
            </div>
          </div>
          <div className="h-[3px] bg-[#141618] rounded-full overflow-hidden">
            <motion.div 
              className="h-full"
              animate={{ 
                width: `${race.tyreWear}%`,
                backgroundColor: race.tyreWear > 80 ? '#FF2A2A' : race.tyreWear > 60 ? '#F5A623' : '#00FFAA'
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-['JetBrains_Mono']">
            <span className={C.textSecondary}>DEG RATE</span>
            <span className="text-[#F5A623]">+{race.tyreDegPerLap.toFixed(3)}s/LAP</span>
          </div>
        </div>

        <div className={`flex flex-col gap-3 ${C.bgSurface} ${C.border} rounded-sm p-4`}>
          <div className={`text-[10px] ${C.textSecondary} tracking-widest`}>FUEL & ERS</div>
          <div className="flex justify-between items-center font-['JetBrains_Mono'] text-sm">
            <span className={C.textSecondary}>FUEL</span>
            <div className="flex items-center gap-2">
              <span className="flex gap-1"><TickNumber value={race.fuelKg.toFixed(1)} />kg</span>
              <span className={`text-[11px] ${race.fuelKg - race.fuelTarget >= 0 ? 'text-[#00FFAA]' : 'text-[#FF2A2A]'}`}>
                {race.fuelKg - race.fuelTarget >= 0 ? '+' : ''}{(race.fuelKg - race.fuelTarget).toFixed(1)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center font-['JetBrains_Mono'] text-sm mt-2">
            <span className={C.textSecondary}>ERS</span>
            <span className="flex gap-1"><TickNumber value={Math.round(race.ersPercent)} />%</span>
          </div>
          <div className="h-[3px] bg-[#141618] rounded-full overflow-hidden">
            <motion.div 
              className="h-full"
              animate={{ 
                width: `${race.ersPercent}%`,
                backgroundColor: race.ersPercent < 20 ? '#FF2A2A' : race.ersPercent < 50 ? '#F5A623' : '#00FFAA'
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className={`mt-auto flex flex-col gap-2 ${C.bgSurface} ${C.border} rounded-sm p-4`}>
          <div className={`text-[10px] ${C.textSecondary} tracking-widest`}>GAP TO LEADER</div>
          <div className="flex justify-between items-end font-['JetBrains_Mono']">
            <div className="text-xl flex gap-1">
              +<TickNumber value={race.gapToLeader.toFixed(3)} />s
            </div>
            <div className={`text-xs pb-1 ${race.gapDelta <= 0 ? 'text-[#00FFAA]' : 'text-[#FF2A2A]'}`}>
              {race.gapDelta > 0 ? '▲' : '▼'} {Math.abs(race.gapDelta).toFixed(3)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* CENTER STAGE */}
      <motion.div 
        className="p-4 overflow-hidden border-r border-white/[0.06] flex flex-col gap-4 h-full"
        onMouseEnter={() => setHoveredZone('center')}
        animate={{ opacity: hoveredZone && hoveredZone !== 'center' ? 0.25 : 1 }}
        transition={{ duration: 0.08 }}
      >
        <TyreDeltaGraph race={race} />
        <SectorStrip race={race} />
        <PedalTrace throttle={pedals.throttle} brake={pedals.brake} />
        <DeltaHistory history={race.deltaHistory} gapToLeader={race.gapToLeader} gapDelta={race.gapDelta} />
      </motion.div>

      {/* RIGHT RAIL */}
      <motion.div 
        className="p-4 overflow-hidden flex flex-col gap-4"
        onMouseEnter={() => setHoveredZone('right')}
        animate={{ opacity: hoveredZone && hoveredZone !== 'right' ? 0.25 : 1 }}
        transition={{ duration: 0.08 }}
      >
        <RadioComms log={race.radioLog} />
        <BoxBoxProtocol race={race} onConfirm={handleConfirmPit} />
      </motion.div>
    </motion.div>
  );
}
