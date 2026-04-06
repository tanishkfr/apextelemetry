import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// --- CONSTANTS & TYPES ---
const C = {
  bg: 'bg-[#000000]',
  panel: 'bg-[#050505] border border-[#333333]',
  label: 'text-[9px] tracking-[0.3em] text-[#666666] uppercase font-bold',
  value: 'text-white font-bold tracking-tighter',
  cyan: '#00E5FF',
  magenta: '#FF007F',
  acid: '#00FFAA',
  yellow: '#F5A623',
  red: '#FF2A2A',
};

interface Telemetry {
  lap: number;
  lapProgress: number;
  gear: number;
  rpm: number;
  speed: number;
  throttle: number;
  brake: number;
  ersSoc: number;
  ersMode: 'OVERTAKE' | 'BUILD' | 'BALANCED';
  ersHarvest: number;
  brakeTemps: [number, number, number, number]; // FL, FR, RL, RR
  tyreSurface: [number, number, number, number];
  tyreCarcass: [number, number, number, number];
  microSectors: ('none' | 'green' | 'purple' | 'yellow')[];
  chartData: { actual: number; target: number }[];
}

// --- UTILS ---
const formatTemp = (t: number) => Math.round(t).toString().padStart(4, '0');

// --- COMPONENTS ---

const BrutalPanel = ({ children, className = '', title = '' }: { children: React.ReactNode, className?: string, title?: string }) => (
  <div className={`${C.panel} relative flex flex-col ${className}`}>
    {/* Corner accents */}
    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#666] -mt-[1px] -ml-[1px]" />
    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#666] -mt-[1px] -mr-[1px]" />
    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#666] -mb-[1px] -ml-[1px]" />
    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#666] -mb-[1px] -mr-[1px]" />
    
    {title && (
      <div className="border-b border-[#333] px-3 py-1.5 flex justify-between items-center bg-[#0A0A0A]">
        <span className={C.label}>{title}</span>
        <div className="w-1.5 h-1.5 bg-[#333]" />
      </div>
    )}
    <div className="p-4 flex-1 flex flex-col">
      {children}
    </div>
  </div>
);

const PanoramicTrack = ({ progress }: { progress: number }) => {
  // A long, jagged, horizontal track path
  const pathData = "M 0 50 L 100 50 L 150 20 L 300 20 L 350 80 L 500 80 L 550 50 L 700 50 L 750 30 L 850 30 L 900 70 L 950 70 L 1000 50";
  
  return (
    <BrutalPanel className="h-32 w-full overflow-hidden" title="TRK-POS // GLOBAL MAPPING">
      <div className="relative w-full h-full flex items-center">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
          {/* Grid lines */}
          <line x1="0" y1="20" x2="1000" y2="20" stroke="#111" strokeWidth="1" />
          <line x1="0" y1="50" x2="1000" y2="50" stroke="#222" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2="1000" y2="80" stroke="#111" strokeWidth="1" />
          
          {/* Track Path */}
          <path d={pathData} fill="none" stroke="#444" strokeWidth="2" />
        </svg>
        
        {/* Progress Dot */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute w-2 h-8 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] -ml-1 -mt-4 border border-white"
            style={{ offsetPath: `path('${pathData}')`, offsetDistance: `${progress * 100}%` } as any}
          />
        </div>
      </div>
    </BrutalPanel>
  );
};

const Powertrain = ({ speed, rpm, gear, throttle, brake }: Telemetry) => (
  <BrutalPanel title="PWR-TRN // TELEMETRY">
    <div className="flex justify-between items-end mb-6">
      <div className="flex flex-col">
        <span className={C.label}>SPEED</span>
        <div className="flex items-baseline gap-1">
          <span className={`${C.value} text-5xl text-[#00E5FF]`}>{speed.toString().padStart(3, '0')}</span>
          <span className="text-[#666] text-xs">KPH</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={C.label}>GEAR</span>
        <AnimatePresence mode="wait">
          <motion.span 
            key={gear}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className={`${C.value} text-5xl text-[#FF007F]`}
          >
            {gear}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>

    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between mb-1">
          <span className={C.label}>RPM</span>
          <span className="text-xs text-white">{Math.round(rpm)} <span className="text-[#666]">/ 12500</span></span>
        </div>
        <div className="h-2 w-full bg-[#111] border border-[#333]">
          <motion.div 
            className="h-full bg-[#00FFAA]"
            style={{ width: `${(rpm / 12500) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className={C.label}>THR</span>
            <span className="text-xs text-[#00FFAA]">{Math.round(throttle)}%</span>
          </div>
          <div className="h-1 w-full bg-[#111]">
            <motion.div className="h-full bg-[#00FFAA]" style={{ width: `${throttle}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className={C.label}>BRK</span>
            <span className="text-xs text-[#FF2A2A]">{Math.round(brake)}%</span>
          </div>
          <div className="h-1 w-full bg-[#111]">
            <motion.div className="h-full bg-[#FF2A2A]" style={{ width: `${brake}%` }} />
          </div>
        </div>
      </div>
    </div>
  </BrutalPanel>
);

const BrakeTemps = ({ temps }: { temps: [number, number, number, number] }) => {
  const getColor = (t: number) => t > 800 ? C.red : t > 500 ? C.yellow : 'white';
  
  return (
    <BrutalPanel title="BRK-TMP // THERMALS">
      <div className="grid grid-cols-2 gap-4 h-full">
        {temps.map((t, i) => (
          <div key={i} className="border border-[#333] bg-[#0A0A0A] p-2 flex flex-col justify-between">
            <span className={C.label}>{['FL', 'FR', 'RL', 'RR'][i]}</span>
            <span className="text-2xl font-bold tracking-tighter" style={{ color: getColor(t) }}>
              {formatTemp(t)}<span className="text-xs text-[#666]">°C</span>
            </span>
          </div>
        ))}
      </div>
    </BrutalPanel>
  );
};

const TyreTemps = ({ surface, carcass }: { surface: [number, number, number, number], carcass: [number, number, number, number] }) => (
  <BrutalPanel title="TYR-TMP // SURF/CARC">
    <div className="grid grid-cols-2 gap-4 h-full">
      {surface.map((s, i) => (
        <div key={i} className="border border-[#333] bg-[#0A0A0A] p-2 flex flex-col gap-2">
          <span className={C.label}>{['FL', 'FR', 'RL', 'RR'][i]}</span>
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[8px] text-[#666]">SURF</span>
              <span className="text-lg text-[#00E5FF] font-bold">{Math.round(s)}°</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-[#666]">CARC</span>
              <span className="text-lg text-white font-bold">{Math.round(carcass[i])}°</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </BrutalPanel>
);

const ERSMetrics = ({ ersSoc, ersMode, ersHarvest }: Telemetry) => (
  <BrutalPanel title="ERS-SYS // KINETIC">
    <div className="flex flex-col h-full justify-between gap-4">
      <div>
        <div className="flex justify-between items-end mb-1">
          <span className={C.label}>STATE OF CHARGE</span>
          <span className="text-2xl text-[#00FFAA] font-bold">{Math.round(ersSoc)}%</span>
        </div>
        <div className="h-4 w-full bg-[#111] border border-[#333] p-[1px]">
          <motion.div className="h-full bg-[#00FFAA]" style={{ width: `${ersSoc}%` }} />
        </div>
      </div>
      
      <div className="flex justify-between items-center border-t border-b border-[#333] py-2">
        <span className={C.label}>DEPLOY MODE</span>
        <span className={`text-lg font-bold ${ersMode === 'OVERTAKE' ? 'text-[#FF007F]' : ersMode === 'BUILD' ? 'text-[#00E5FF]' : 'text-[#00FFAA]'}`}>
          [{ersMode}]
        </span>
      </div>
      
      <div className="flex justify-between items-end">
        <span className={C.label}>HARVEST RATE</span>
        <span className="text-xl text-white font-bold">+{ersHarvest.toFixed(1)} <span className="text-xs text-[#666]">kW</span></span>
      </div>
    </div>
  </BrutalPanel>
);

const MicroSectors = ({ sectors }: { sectors: Telemetry['microSectors'] }) => (
  <BrutalPanel title="M-SEC // DELTA ANALYSIS">
    <div className="flex gap-1 h-12 w-full">
      {sectors.map((state, i) => {
        let bg = 'bg-[#111]';
        if (state === 'green') bg = 'bg-[#00FFAA]';
        if (state === 'purple') bg = 'bg-[#FF007F]';
        if (state === 'yellow') bg = 'bg-[#F5A623]';
        
        return (
          <div key={i} className={`flex-1 ${bg} border border-black transition-colors duration-75`} />
        );
      })}
    </div>
  </BrutalPanel>
);

const AggressiveChart = ({ data }: { data: Telemetry['chartData'] }) => {
  const maxPts = 100;
  const width = 800;
  const height = 200;
  
  const minVal = -1.0;
  const maxVal = 2.0;
  
  const getY = (val: number) => height - ((val - minVal) / (maxVal - minVal)) * height;
  const getX = (index: number) => (index / (maxPts - 1)) * width;

  const actualPoints = data.map((d, i) => `${getX(i)},${getY(d.actual)}`).join(' ');
  const targetPoints = data.map((d, i) => `${getX(i)},${getY(d.target)}`).join(' ');

  const latestActual = data.length > 0 ? data[data.length - 1].actual : 0;
  const latestX = data.length > 0 ? getX(data.length - 1) : 0;
  const latestY = getY(latestActual);

  return (
    <BrutalPanel title="TYR-DLT // PREDICTIVE DEGRADATION" className="flex-1">
      <div className="relative w-full h-full flex-1 border border-[#333] bg-[#050505] overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {/* Y-Axis Grid */}
          {[0, 0.5, 1.0, 1.5].map(v => (
            <g key={v}>
              <line x1="0" y1={getY(v)} x2={width} y2={getY(v)} stroke="#222" strokeWidth="1" strokeDasharray="4 4" />
              <text x="5" y={getY(v) - 5} fill="#666" fontSize="10" fontFamily="monospace">{v.toFixed(1)}</text>
            </g>
          ))}
          
          {/* Target Line */}
          <polyline points={targetPoints} fill="none" stroke="#00E5FF" strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Actual Line */}
          <polyline points={actualPoints} fill="none" stroke="#FF007F" strokeWidth="2" />
          
          {/* Crosshair */}
          {data.length > 0 && (
            <g>
              <line x1={latestX} y1="0" x2={latestX} y2={height} stroke="#fff" strokeWidth="1" opacity="0.5" />
              <line x1="0" y1={latestY} x2={width} y2={latestY} stroke="#fff" strokeWidth="1" opacity="0.5" />
              <circle cx={latestX} cy={latestY} r="4" fill="#FF007F" />
              <rect x={latestX + 10} y={latestY - 10} width="40" height="20" fill="#FF007F" />
              <text x={latestX + 15} y={latestY + 4} fill="#000" fontSize="12" fontWeight="bold" fontFamily="monospace">
                {latestActual.toFixed(2)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </BrutalPanel>
  );
};

// --- MAIN APP ---

export default function APEXTelemetry() {
  const [telemetry, setTelemetry] = useState<Telemetry>({
    lap: 1, lapProgress: 0, gear: 1, rpm: 4000, speed: 0, throttle: 0, brake: 0,
    ersSoc: 100, ersMode: 'BALANCED', ersHarvest: 0,
    brakeTemps: [200, 200, 200, 200],
    tyreSurface: [80, 80, 80, 80],
    tyreCarcass: [90, 90, 90, 90],
    microSectors: Array(20).fill('none'),
    chartData: []
  });

  const telRef = useRef(telemetry);
  const frameCount = useRef(0);

  // Pre-generate a lap's worth of sector colors for simulation
  const lapSectorColors = useRef<('green'|'purple'|'yellow')[]>(
    Array(20).fill('none').map(() => {
      const r = Math.random();
      return r > 0.8 ? 'purple' : r > 0.3 ? 'green' : 'yellow';
    })
  );

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      frameCount.current++;

      const t = telRef.current;
      
      // Driving dynamics simulation
      let newThrottle = t.throttle + (Math.random() * 40 - 20);
      newThrottle = Math.max(0, Math.min(100, newThrottle));
      
      let newBrake = 0;
      if (newThrottle < 10) {
        newBrake = t.brake + (Math.random() * 60 - 10);
        newBrake = Math.max(0, Math.min(100, newBrake));
      }

      let newRpm = t.rpm + (newThrottle > 50 ? 300 : -400) + (Math.random() * 200 - 100);
      let newGear = t.gear;
      if (newRpm > 12000 && newGear < 8) { newGear++; newRpm = 8000; }
      if (newRpm < 6000 && newGear > 1) { newGear--; newRpm = 11000; }
      newRpm = Math.max(4000, Math.min(12500, newRpm));

      const newSpeed = Math.max(0, Math.min(340, t.speed + (newThrottle > 50 ? 1.5 : newBrake > 20 ? -3 : -0.5)));

      // Temps simulation
      const newBrakeTemps = t.brakeTemps.map(bt => {
        let next = bt;
        if (newBrake > 0) next += newBrake * 0.5;
        else next -= 2;
        return Math.max(200, Math.min(1200, next));
      }) as [number, number, number, number];

      const newTyreSurface = t.tyreSurface.map((st, i) => {
        let next = st;
        next += (newThrottle * 0.01) + (newBrake * 0.02);
        next -= 0.5; // cooling
        return Math.max(80, Math.min(140, next));
      }) as [number, number, number, number];

      const newTyreCarcass = t.tyreCarcass.map((ct, i) => {
        // Carcass slowly follows surface
        return ct + (newTyreSurface[i] - ct) * 0.01;
      }) as [number, number, number, number];

      // ERS Simulation
      let newErsMode = t.ersMode;
      if (newThrottle > 90) newErsMode = 'OVERTAKE';
      else if (newBrake > 50) newErsMode = 'BUILD';
      else newErsMode = 'BALANCED';

      let newErsSoc = t.ersSoc;
      let newHarvest = 0;
      if (newErsMode === 'OVERTAKE') newErsSoc -= 0.1;
      if (newErsMode === 'BUILD') { newErsSoc += 0.2; newHarvest = newBrake * 1.5; }
      newErsSoc = Math.max(0, Math.min(100, newErsSoc));

      // Track Progress & Micro Sectors
      let newProgress = t.lapProgress + (newSpeed / 340) * dt * 0.02;
      let newLap = t.lap;
      let newMicroSectors = [...t.microSectors];

      if (newProgress >= 1) {
        newProgress = 0;
        newLap++;
        newMicroSectors = Array(20).fill('none');
        // Generate new lap sector colors
        lapSectorColors.current = Array(20).fill('none').map(() => {
          const r = Math.random();
          return r > 0.8 ? 'purple' : r > 0.3 ? 'green' : 'yellow';
        });
      }

      const currentSectorIdx = Math.floor(newProgress * 20);
      for (let i = 0; i < 20; i++) {
        if (i < currentSectorIdx) newMicroSectors[i] = lapSectorColors.current[i];
        else if (i === currentSectorIdx) newMicroSectors[i] = frameCount.current % 10 < 5 ? lapSectorColors.current[i] : 'none'; // Flashing
        else newMicroSectors[i] = 'none';
      }

      // Chart Data (update every 5 frames to create jagged look)
      let newChartData = t.chartData;
      if (frameCount.current % 5 === 0) {
        const actual = Math.sin(time / 2000) * 0.5 + (Math.random() * 0.4 - 0.2) + 0.5;
        const target = Math.sin(time / 2000) * 0.5 + 0.4;
        newChartData = [...t.chartData, { actual, target }].slice(-100);
      }

      const nextTel: Telemetry = {
        lap: newLap, lapProgress: newProgress, gear: newGear, rpm: newRpm, speed: Math.round(newSpeed),
        throttle: newThrottle, brake: newBrake,
        ersSoc: newErsSoc, ersMode: newErsMode, ersHarvest: newHarvest,
        brakeTemps: newBrakeTemps, tyreSurface: newTyreSurface, tyreCarcass: newTyreCarcass,
        microSectors: newMicroSectors, chartData: newChartData
      };

      telRef.current = nextTel;
      setTelemetry(nextTel);

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={`w-screen h-screen ${C.bg} text-white font-['JetBrains_Mono',monospace] p-4 flex flex-col gap-4 overflow-hidden selection:bg-[#FF007F]/30`}>
      
      {/* TOP HEADER ROW */}
      <PanoramicTrack progress={telemetry.lapProgress} />

      {/* BOTTOM DATA GRID */}
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0">
        
        {/* COL 1: Powertrain & ERS */}
        <div className="col-span-1 flex flex-col gap-4">
          <Powertrain {...telemetry} />
          <ERSMetrics {...telemetry} />
        </div>

        {/* COL 2: Thermals */}
        <div className="col-span-1 flex flex-col gap-4">
          <BrakeTemps temps={telemetry.brakeTemps} />
          <TyreTemps surface={telemetry.tyreSurface} carcass={telemetry.tyreCarcass} />
        </div>

        {/* COL 3 & 4: Analysis & Charts */}
        <div className="col-span-2 flex flex-col gap-4">
          <MicroSectors sectors={telemetry.microSectors} />
          <AggressiveChart data={telemetry.chartData} />
        </div>

      </div>
    </div>
  );
}

