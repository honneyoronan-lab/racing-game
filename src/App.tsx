import React, { useState, useEffect, useCallback } from 'react';
import { MiniRacerGame } from './components/MiniRacerGame';
import { THEMES } from './data/cars';
import { MapThemeId } from './types/game';
import { 
  Monitor, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Flame, 
  Trophy, 
  Compass, 
  Activity, 
  Sparkles, 
  Keyboard
} from 'lucide-react';
import { sound } from './utils/audio';

export default function App() {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTheme, setActiveTheme] = useState<MapThemeId>('neon_midnight');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTouchButtonsOnDesktop, setShowTouchButtonsOnDesktop] = useState(false);

  // Live telemetry received from game engine
  const [telemetry, setTelemetry] = useState({
    speedKmh: 0,
    boost: 100,
    score: 0,
    highScore: 0,
    gear: 1,
    rpm: 2000,
    gForce: 0,
    shield: false,
    state: 'MENU'
  });

  const handleTelemetryUpdate = useCallback((data: {
    speedKmh: number;
    boost: number;
    score: number;
    highScore: number;
    gear: number;
    rpm: number;
    gForce: number;
    shield: boolean;
    state: string;
  }) => {
    setTelemetry(data);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Global hotkeys for desktop
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const currentThemeData = THEMES[activeTheme] || THEMES.neon_midnight;

  return (
    <div className="w-full h-screen bg-[#07090e] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="h-14 px-4 sm:px-6 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between z-50 flex-shrink-0">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            MINI RACER
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded">
            7 CIRCUITS EDITION
          </span>
        </div>

        {/* Zone 2: Circuit Map Selector Bar */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto max-w-xl py-1 no-scrollbar">
          {(Object.keys(THEMES) as MapThemeId[]).map(themeKey => {
            const t = THEMES[themeKey];
            const isActive = activeTheme === themeKey;
            return (
              <button
                key={themeKey}
                onClick={() => {
                  setActiveTheme(themeKey);
                  sound.playTap();
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800/60'
                }`}
                title={t.tagline}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Zone 3: Primary Actions (View Mode Switcher + Fullscreen) */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setViewMode('desktop');
                sound.playTap();
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Arcade Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => {
                setViewMode('mobile');
                sound.playTap();
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Device View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center justify-center transition-colors"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex overflow-hidden relative">
        {viewMode === 'desktop' ? (
          /* DESKTOP ARCADE COCKPIT MODE */
          <div className="w-full h-full flex flex-col lg:flex-row items-stretch justify-between overflow-hidden bg-radial from-[#0d1424] via-[#080c16] to-[#04060a]">
            {/* LEFT COCKPIT WING: INSTRUMENT GAUGES & MAP CHOOSER */}
            <aside className="hidden lg:flex w-72 xl:w-80 flex-col justify-between p-5 border-r border-slate-800/80 bg-slate-950/40 backdrop-blur-sm z-10 flex-shrink-0 overflow-y-auto">
              <div className="space-y-4">
                {/* Sector Information & Quick Map Switcher */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      Current Circuit
                    </span>
                    <span className="text-xs">{currentThemeData.icon}</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">
                    {currentThemeData.name}
                  </div>
                  <div className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {currentThemeData.tagline}
                  </div>

                  {/* Circuit Grid Selector */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800">
                    {(Object.keys(THEMES) as MapThemeId[]).map(themeKey => {
                      const t = THEMES[themeKey];
                      const isSel = activeTheme === themeKey;
                      return (
                        <button
                          key={themeKey}
                          onClick={() => {
                            setActiveTheme(themeKey);
                            sound.playTap();
                          }}
                          className={`p-1.5 rounded-lg text-[11px] font-medium text-left truncate flex items-center gap-1 transition-colors ${
                            isSel
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                              : 'text-slate-400 hover:text-white bg-slate-950/50 border border-slate-800/80'
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tachometer & Speed Dial Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      ENGINE RPM
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {telemetry.rpm} RPM
                    </span>
                  </div>

                  {/* RPM Progress Bar */}
                  <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 via-amber-400 to-rose-500 transition-all duration-75"
                      style={{ width: `${Math.min(100, (telemetry.rpm / 8500) * 100)}%` }}
                    />
                  </div>

                  {/* Digital Speed & Gear Cluster */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Gear</span>
                      <span className="text-2xl font-black font-mono text-amber-400">
                        {telemetry.speedKmh > 10 ? `${telemetry.gear}` : 'N'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">G-Force</span>
                      <span className="text-2xl font-black font-mono text-sky-400">
                        {telemetry.gForce > 0 ? `+${telemetry.gForce}` : `${telemetry.gForce}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Boost Pressure Meter */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      NITRO PRESSURE
                    </span>
                    <span className="font-mono text-white font-bold">{telemetry.boost}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-75"
                      style={{ width: `${telemetry.boost}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Touch Controls Toggle */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-3">
                <span className="text-xs text-slate-400">Touch Buttons</span>
                <button
                  onClick={() => setShowTouchButtonsOnDesktop(prev => !prev)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    showTouchButtonsOnDesktop ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      showTouchButtonsOnDesktop ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </aside>

            {/* CENTER HIGHWAY CANVAS */}
            <div className="flex-1 h-full flex items-center justify-center relative overflow-hidden">
              <MiniRacerGame
                viewMode="desktop"
                showTouchControls={showTouchButtonsOnDesktop}
                activeTheme={activeTheme}
                onThemeChange={setActiveTheme}
                onTelemetryUpdate={handleTelemetryUpdate}
              />
            </div>

            {/* RIGHT COCKPIT WING: COMMANDS & CAREER RECORDS */}
            <aside className="hidden lg:flex w-72 xl:w-80 flex-col justify-between p-5 border-l border-slate-800/80 bg-slate-950/40 backdrop-blur-sm z-10 flex-shrink-0 overflow-y-auto">
              <div className="space-y-4">
                {/* Career High Score Card */}
                <div className="bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Trophy className="w-4 h-4" />
                    All-Time Record
                  </div>
                  <div className="text-3xl font-black font-mono text-white tabular-nums">
                    {telemetry.highScore || 0}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Score multiplier items stack during active overdrive runs!
                  </div>
                </div>

                {/* Desktop Keyboard Controls Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wide mb-3">
                    <Keyboard className="w-4 h-4 text-cyan-400" />
                    Keyboard Cheatsheet
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Steer Left / Right</span>
                      <div className="flex gap-1 font-mono font-bold">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">A</kbd>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">D</kbd>
                        <span className="text-slate-500">or</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">←</kbd>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">→</kbd>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Nitro Boost</span>
                      <div className="flex gap-1 font-mono font-bold">
                        <kbd className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300">SPACE</kbd>
                        <span className="text-slate-500">or</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">W</kbd>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Pause / Resume</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">P</kbd>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Instant Restart</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">R</kbd>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Toggle Mute</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">M</kbd>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Toggle Fullscreen</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white font-bold">F</kbd>
                    </div>
                  </div>
                </div>

                {/* Collectibles Power-Up Guide */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="text-[11px] font-mono text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Power-Up Drops
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span>★</span>
                      <span className="font-semibold text-amber-300">Invincibility:</span>
                      <span className="text-slate-400">Smash traffic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⚡</span>
                      <span className="font-semibold text-purple-300">2X Multiplier:</span>
                      <span className="text-slate-400">Double score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🧲</span>
                      <span className="font-semibold text-cyan-300">Magnet:</span>
                      <span className="text-slate-400">Attract coins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🛡️</span>
                      <span className="font-semibold text-emerald-300">Shield:</span>
                      <span className="text-slate-400">Deflect 1 crash</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Tip */}
              <div className="text-[11px] text-slate-500 text-center font-mono pt-3">
                Press [F] anytime for borderless fullscreen
              </div>
            </aside>
          </div>
        ) : (
          /* MOBILE HANDHELD SIMULATOR MODE */
          <div className="w-full h-full flex items-center justify-center p-4 bg-slate-950">
            {/* Smartphone Chassis Bezel */}
            <div className="w-full max-w-[420px] h-[92vh] max-h-[880px] bg-black rounded-[44px] border-[6px] border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.2)] overflow-hidden relative flex flex-col">
              {/* Top Dynamic Island / Camera Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-40 flex items-center justify-end px-2">
                <div className="w-2 h-2 rounded-full bg-slate-800" />
              </div>

              {/* Game Viewport inside phone */}
              <div className="flex-1 w-full h-full relative overflow-hidden">
                <MiniRacerGame
                  viewMode="mobile"
                  showTouchControls={true}
                  activeTheme={activeTheme}
                  onThemeChange={setActiveTheme}
                />
              </div>

              {/* Home indicator bar at bottom */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full pointer-events-none z-40" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
