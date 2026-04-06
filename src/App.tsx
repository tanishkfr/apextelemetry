import React, { useState, useEffect, useRef } from 'react';

const INITIAL_MOCK_RACE = {
  lap: 34,
  totalLaps: 57,
  flag: "GREEN",
  gapToLeader: "+4.821s",
  tyreLaps: 18,
  tyreCompound: "MEDIUM",
  tyreWear: 67,
  tyreDeltaPerLap: +0.043,
  fuelLoad: 42.3,
  fuelDelta: -0.2,
  ERSDeployment: 78,
  sectors: [22.431, 31.819, 19.204],
  sectorDeltas: [-0.041, +0.183, -0.009],
  pitWindowOpen: true,
  pitWindowLaps: [35, 41],
  currentLapTime: 73.454,
  bestLapTime: 73.209,
};

const COMMS_LOG = [
  { id: 1, sender: 'ENGINEER', msg: 'Box to overtake, box to overtake.' },
  { id: 2, sender: 'DRIVER', msg: 'Tyres are dropping off.' },
  { id: 3, sender: 'ENGINEER', msg: 'Understood. Pit window opens next lap.' },
  { id: 4, sender: 'DRIVER', msg: 'Copy that.' },
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  --bg: #050505;
  --surface-1: #0D0F10;
  --surface-2: #1A1C1E;
  --text-primary: #F0F2F0;
  --accent-optimal: #00FFAA;
  --accent-warning: #F5A623;
  --accent-critical: #FF2A2A;
  --accent-neutral: #5A6370;
  --border: 1px solid rgba(255,255,255,0.06);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--bg);
  color: var(--text-primary);
  font-family: system-ui, sans-serif;
  overflow: hidden;
  user-select: none;
}

.font-mono {
  font-family: 'JetBrains Mono', monospace;
}

.apex-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  padding: 16px;
  gap: 16px;
}

.rail-left {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.center-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rail-right {
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block {
  background-color: var(--surface-1);
  border: var(--border);
  border-radius: 4px;
  padding: 16px;
  transition: opacity 80ms cubic-bezier(0.16, 1, 0.3, 1);
}

.hover-group:hover .block:not(:hover) {
  opacity: 0.25;
}

.label {
  font-size: 10px;
  color: var(--accent-neutral);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.value {
  font-size: 24px;
  font-weight: 500;
}

@keyframes tick {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.tick-anim {
  display: inline-block;
  animation: tick 120ms linear;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.pill.green { background: rgba(0, 255, 170, 0.1); color: var(--accent-optimal); border: 1px solid rgba(0, 255, 170, 0.2); }
.pill.yellow { background: rgba(245, 166, 35, 0.1); color: var(--accent-warning); border: 1px solid rgba(245, 166, 35, 0.2); }
.pill.red { background: rgba(255, 42, 42, 0.1); color: var(--accent-critical); border: 1px solid rgba(255, 42, 42, 0.2); }

.graph-container {
  flex: 1;
  position: relative;
  background: var(--surface-2);
  border: var(--border);
  border-radius: 4px;
  padding: 24px 16px 16px 16px;
  display: flex;
  flex-direction: column;
}

.graph-area {
  flex: 1;
  position: relative;
}

.graph-x-axis {
  height: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 10px;
  color: var(--accent-neutral);
  margin-top: 8px;
}

.graph-y-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.graph-y-line {
  border-top: 1px dashed rgba(255, 255, 255, 0.04);
  width: 100%;
}

.pit-window-band {
  position: absolute;
  top: 0; bottom: 0;
  background: rgba(0, 255, 170, 0.06);
  pointer-events: none;
}

.current-lap-line {
  position: absolute;
  top: 0; bottom: 0;
  width: 1px;
  background: var(--accent-optimal);
  pointer-events: none;
}

.curve-line {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
}

.curve-path-current {
  fill: none;
  stroke: var(--accent-warning);
  stroke-width: 1;
  filter: drop-shadow(0 0 2px var(--accent-warning));
}

.curve-path-fresh {
  fill: none;
  stroke: var(--accent-optimal);
  stroke-width: 1;
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
}

.crossover-pulse {
  position: absolute;
  width: 8px; height: 8px;
  background: var(--accent-optimal);
  border-radius: 50%;
  animation: pulse 1.5s infinite cubic-bezier(0.16, 1, 0.3, 1);
}

.hover-col {
  position: absolute;
  top: 0; bottom: 0;
  cursor: crosshair;
}

.hover-col:hover {
  background: rgba(255, 255, 255, 0.03);
}

.tooltip {
  position: absolute;
  background: var(--surface-1);
  border: var(--border);
  padding: 4px 8px;
  font-size: 11px;
  color: var(--text-primary);
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, -120%);
  z-index: 10;
}

.sectors-row {
  display: flex;
  gap: 16px;
  height: 100px;
}

.sector-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.sector-time {
  font-size: 20px;
  margin-bottom: 4px;
}

.sector-delta {
  font-size: 12px;
}

.comms-log {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  overflow: hidden;
}

.comm-msg {
  font-size: 11px;
  line-height: 1.4;
}

.slider-container {
  height: 120px;
  display: flex;
  flex-direction: column;
}

.slider-track {
  flex: 1;
  background: var(--surface-2);
  border: var(--border);
  border-radius: 4px;
  position: relative;
  margin-top: 16px;
  overflow: hidden;
}

.slider-thumb {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 60px;
  background: var(--accent-neutral);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.slider-thumb:active {
  cursor: grabbing;
}

.slider-fill {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  background: rgba(0, 255, 170, 0.1);
  pointer-events: none;
}

@keyframes borderPulse {
  0% { border-color: rgba(0, 255, 170, 0.2); box-shadow: 0 0 0 rgba(0, 255, 170, 0); }
  50% { border-color: rgba(0, 255, 170, 1); box-shadow: 0 0 10px rgba(0, 255, 170, 0.5); }
  100% { border-color: rgba(0, 255, 170, 0.2); box-shadow: 0 0 0 rgba(0, 255, 170, 0); }
}

.transmitted {
  animation: borderPulse 1s infinite;
}

.color-optimal { color: var(--accent-optimal); }
.color-warning { color: var(--accent-warning); }
.color-critical { color: var(--accent-critical); }
.color-neutral { color: var(--accent-neutral); }
`;

function useTickValue(value: number | string) {
  const [tick, setTick] = useState(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setTick(t => t + 1);
      prevValue.current = value;
    }
  }, [value]);

  return <span key={tick} className="tick-anim font-mono">{value}</span>;
}

export default function APEXTelemetry() {
  const [race, setRace] = useState(INITIAL_MOCK_RACE);
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [transmitted, setTransmitted] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [hoveredLap, setHoveredLap] = useState<number | null>(null);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);
    return () => { document.head.removeChild(styleEl); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRace(prev => {
        const newLap = prev.lap + (Math.random() > 0.8 ? 1 : 0);
        const newTyreWear = Math.min(100, prev.tyreWear + (0.3 + Math.random() * 0.4));
        const newSectors = prev.sectors.map(s => s + (Math.random() * 0.2 - 0.1));
        const newSectorDeltas = prev.sectorDeltas.map(d => d + (Math.random() * 0.1 - 0.05));
        const newFuelLoad = Math.max(0, prev.fuelLoad - 0.05);
        
        return {
          ...prev,
          lap: newLap > prev.totalLaps ? prev.totalLaps : newLap,
          tyreWear: newTyreWear,
          sectors: newSectors,
          sectorDeltas: newSectorDeltas,
          fuelLoad: newFuelLoad,
        };
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (transmitted) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sliderRef.current || transmitted) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    setSliderPos(percentage);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (sliderPos > 0.95) {
      setSliderPos(1);
      setTransmitted(true);
      setTimeout(() => {
        setTransmitted(false);
        setSliderPos(0);
      }, 3000);
    } else {
      setSliderPos(0);
    }
  };

  const startLap = 30;
  const endLap = 57;
  const totalGraphLaps = endLap - startLap + 1;

  const getX = (lap: number) => ((lap - startLap) / (totalGraphLaps - 1)) * 100;

  const currentCurve = Array.from({ length: totalGraphLaps }).map((_, i) => {
    const lap = startLap + i;
    if (lap < 16) return null;
    const wearFactor = Math.pow((lap - 16) / 40, 2);
    return { lap, y: 80 - wearFactor * 60 };
  }).filter(p => p !== null) as {lap: number, y: number}[];

  const freshCurve = Array.from({ length: totalGraphLaps }).map((_, i) => {
    const lap = startLap + i;
    return { lap, y: 60 };
  });

  const crossoverLap = 38;

  return (
    <div className="apex-container hover-group">
      {/* LEFT RAIL */}
      <div className="rail-left">
        <div style={{ fontSize: '11px', color: 'var(--accent-optimal)', letterSpacing: '11px', fontWeight: 700, marginBottom: '8px' }}>
          APEX
        </div>
        
        <div className="block">
          <div className="label">RACE STATUS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="value font-mono">L{useTickValue(race.lap)}<span style={{ fontSize: '14px', color: 'var(--accent-neutral)' }}>/{race.totalLaps}</span></div>
            <div className="pill green">{race.flag}</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-neutral)', display: 'flex', justifyContent: 'space-between' }}>
            <span>GAP TO LEADER</span>
            <span className="font-mono color-warning">{useTickValue(race.gapToLeader)}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-neutral)', display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span>WEATHER</span>
            <span>🌥 18°C</span>
          </div>
        </div>

        <div className="block">
          <div className="label">TYRE DATA</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="pill yellow">{race.tyreCompound}</div>
            <div className="font-mono" style={{ fontSize: '14px' }}>{useTickValue(race.tyreLaps)} LAPS</div>
          </div>
          <div style={{ height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${race.tyreWear}%`, background: 'var(--accent-warning)', transition: 'width 120ms linear' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span className="color-neutral">WEAR</span>
            <span className="font-mono color-warning">{useTickValue(race.tyreWear.toFixed(1))}%</span>
          </div>
        </div>

        <div className="block">
          <div className="label">FUEL & ERS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="color-neutral">LOAD</span>
            <span className="font-mono">{useTickValue(race.fuelLoad.toFixed(1))} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="color-neutral">DELTA</span>
            <span className="font-mono color-critical">{useTickValue(race.fuelDelta.toFixed(1))} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="color-neutral">ERS DEP.</span>
            <span className="font-mono color-optimal">{useTickValue(race.ERSDeployment)}%</span>
          </div>
        </div>
      </div>

      {/* CENTER STAGE */}
      <div className="center-stage">
        <div className="graph-container block">
          <div className="label">PREDICTIVE TYRE DELTA</div>
          <div className="graph-area">
            {/* Y Grid */}
            <div className="graph-y-grid">
              <div className="graph-y-line"></div>
              <div className="graph-y-line"></div>
              <div className="graph-y-line"></div>
              <div className="graph-y-line"></div>
            </div>

            {/* Pit Window Band */}
            <div className="pit-window-band" style={{ 
              left: `${getX(race.pitWindowLaps[0])}%`, 
              right: `${100 - getX(race.pitWindowLaps[1])}%` 
            }}></div>

            {/* Current Lap Line */}
            <div className="current-lap-line" style={{ left: `${getX(race.lap)}%` }}></div>

            {/* Curves */}
            <svg className="curve-line" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path className="curve-path-current" d={`M ${currentCurve.map(p => `${getX(p.lap)},${100 - p.y}`).join(' L ')}`} />
              <path className="curve-path-fresh" d={`M ${freshCurve.map(p => `${getX(p.lap)},${100 - p.y}`).join(' L ')}`} />
            </svg>

            {/* Crossover Pulse */}
            <div className="crossover-pulse" style={{ 
              left: `${getX(crossoverLap)}%`, 
              top: `${100 - 60}%` 
            }}></div>

            {/* Hover Columns */}
            {Array.from({ length: totalGraphLaps }).map((_, i) => {
              const lap = startLap + i;
              return (
                <div 
                  key={lap} 
                  className="hover-col" 
                  style={{ left: `${getX(lap) - 100/(totalGraphLaps-1)/2}%`, width: `${100/(totalGraphLaps-1)}%` }}
                  onMouseEnter={() => setHoveredLap(lap)}
                  onMouseLeave={() => setHoveredLap(null)}
                >
                  {hoveredLap === lap && (
                    <div className="tooltip" style={{ left: '50%', top: `${100 - (lap < crossoverLap ? 80 - Math.pow((lap - 16) / 40, 2) * 60 : 60)}%` }}>
                      <span className="font-mono">+{((lap - 30) * 0.043).toFixed(3)}s / LAP</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="graph-x-axis">
            <span>L30</span>
            <span>L35</span>
            <span>L40</span>
            <span>L45</span>
            <span>L50</span>
            <span>L55</span>
          </div>
        </div>

        <div className="sectors-row">
          {race.sectors.map((sec, i) => {
            const delta = race.sectorDeltas[i];
            const isFaster = delta < 0;
            return (
              <div key={i} className="sector-card block">
                <div className="label">SECTOR {i + 1}</div>
                <div className="sector-time font-mono">{useTickValue(sec.toFixed(3))}</div>
                <div className={`sector-delta font-mono ${isFaster ? 'color-optimal' : 'color-critical'}`}>
                  {useTickValue((isFaster ? '' : '+') + delta.toFixed(3))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT RAIL */}
      <div className="rail-right">
        <div className="block" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="label">RADIO COMMS</div>
          <div className="comms-log">
            {COMMS_LOG.map((log, i) => (
              <div key={log.id} className="comm-msg font-mono" style={{ opacity: 1 - (COMMS_LOG.length - 1 - i) * 0.25 }}>
                <span style={{ color: log.sender === 'ENGINEER' ? 'var(--accent-optimal)' : 'var(--accent-neutral)' }}>{log.sender}: </span>
                <span style={{ color: 'var(--text-primary)' }}>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`block slider-container ${transmitted ? 'transmitted' : ''}`} style={{ borderColor: race.pitWindowOpen ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 42, 42, 0.2)' }}>
          <div className="label" style={{ color: race.pitWindowOpen ? 'var(--accent-optimal)' : 'var(--accent-critical)' }}>
            {transmitted ? 'TRANSMITTED 🟢' : 'INITIATE PIT CALL'}
          </div>
          <div 
            className="slider-track" 
            ref={sliderRef}
          >
            <div className="slider-fill" style={{ width: `${sliderPos * 100}%` }}></div>
            <div 
              className="slider-thumb" 
              style={{ 
                left: `${sliderPos * 100}%`, 
                transform: `translateX(-${sliderPos * 100}%)`,
                transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
