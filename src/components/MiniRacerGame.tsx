import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  GameState, 
  TrafficCar, 
  TrafficCarType,
  Collectible, 
  CollectibleType,
  ActivePowerUps,
  Particle, 
  FloatingText, 
  GameSettings, 
  GameSessionStats,
  MapThemeId 
} from '../types/game';
import { CARS_DATA, THEMES } from '../data/cars';
import { sound } from '../utils/audio';
import { 
  Trophy, 
  RotateCcw, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Car, 
  Coins, 
  Flame, 
  ShieldCheck, 
  Sparkles,
  Smartphone,
  Gauge,
  MapPin
} from 'lucide-react';

const LANE_COUNT = 4;
const ROAD_BASE_WIDTH = 340;
const ROAD_MAX_WIDTH_MOBILE = 420;
const ROAD_MAX_WIDTH_DESKTOP = 490;

export interface MiniRacerGameProps {
  viewMode?: 'desktop' | 'mobile';
  showTouchControls?: boolean;
  onToggleViewMode?: () => void;
  activeTheme?: MapThemeId;
  onThemeChange?: (theme: MapThemeId) => void;
  onTelemetryUpdate?: (data: {
    speedKmh: number;
    boost: number;
    score: number;
    highScore: number;
    gear: number;
    rpm: number;
    gForce: number;
    shield: boolean;
    state: GameState;
  }) => void;
}

export const MiniRacerGame: React.FC<MiniRacerGameProps> = ({
  viewMode = 'desktop',
  showTouchControls = true,
  onToggleViewMode,
  activeTheme = 'neon_midnight',
  onThemeChange,
  onTelemetryUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High level UI States
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);
  const [showGarage, setShowGarage] = useState<boolean>(false);
  const [showTrackSelect, setShowTrackSelect] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('miniracer_highscore') || '0', 10);
  });
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem('miniracer_coins') || '0', 10);
  });
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [boostLevel, setBoostLevel] = useState<number>(100);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [stats, setStats] = useState<GameSessionStats>({
    score: 0,
    highScore: 0,
    coinsCollected: 0,
    totalCoins: 0,
    distanceKm: 0,
    nearMisses: 0,
    maxSpeedKmh: 0,
    boostDurationSec: 0
  });

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    hapticsEnabled: true,
    controlScheme: 'touch_buttons',
    theme: activeTheme
  });

  useEffect(() => {
    setSettings(prev => ({ ...prev, theme: activeTheme }));
  }, [activeTheme]);

  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUps>({
    invincibleTimer: 0,
    invincibleTotal: 480,
    multiplierTimer: 0,
    multiplierTotal: 600,
    multiplierFactor: 1,
    magnetTimer: 0,
    magnetTotal: 480,
    shield: false
  });

  // Game internal mutable loop refs
  const gameRef = useRef({
    state: 'MENU' as GameState,
    roadY: 0,
    laneWidth: 80,
    roadWidth: 340,
    roadX: 0,
    touch: { left: false, right: false, boost: false },
    player: {
      lane: 1.5,
      actualLane: 1.5,
      x: 0,
      y: 0,
      w: 42,
      h: 76,
      speed: 5,
      tilt: 0,
      targetTilt: 0,
      boostMeter: 100,
      shield: false,
      shieldTime: 0,
      invulnerableTime: 0
    },
    powerUps: {
      invincibleTimer: 0,
      invincibleTotal: 480,
      multiplierTimer: 0,
      multiplierTotal: 600,
      multiplierFactor: 2,
      magnetTimer: 0,
      magnetTotal: 480,
      shield: false
    },
    cars: [] as TrafficCar[],
    collectibles: [] as Collectible[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    score: 0,
    distanceMeters: 0,
    nearMisses: 0,
    coinsCollectedThisRun: 0,
    topSpeed: 0,
    cameraShake: 0,
    spawnTimer: 0,
    collectibleTimer: 0,
    lastFrameTime: performance.now(),
    animationFrameId: 0,
    carIdCounter: 1,
    trafficSpeedVariation: 1
  });

  const selectedCar = CARS_DATA[selectedCarIndex] || CARS_DATA[0];

  // Sync mute state
  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      sound.setMuted(next);
      return next;
    });
  }, []);

  // Vibrate helper
  const triggerHaptic = (pattern: number | number[] = 20) => {
    if (settings.hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat && ['p', 'P', 'm', 'M', 'r', 'R'].includes(e.key)) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameRef.current.touch.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameRef.current.touch.right = true;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        e.preventDefault();
        gameRef.current.touch.boost = true;
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'r' || e.key === 'R') {
        if (gameRef.current.state === 'GAMEOVER') {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameRef.current.touch.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameRef.current.touch.right = false;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        gameRef.current.touch.boost = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleToggleMute]);

  // Handle Resize & Canvas resolution
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Dynamic road dimensions with desktop widescreen expansion support
    const isDesktop = viewMode === 'desktop';
    const maxRoadW = isDesktop ? ROAD_MAX_WIDTH_DESKTOP : ROAD_MAX_WIDTH_MOBILE;
    const roadWidth = Math.min(maxRoadW, Math.max(ROAD_BASE_WIDTH, width * (isDesktop ? 0.82 : 0.72)));
    const laneWidth = roadWidth / LANE_COUNT;
    const roadX = (width - roadWidth) / 2;

    gameRef.current.roadWidth = roadWidth;
    gameRef.current.laneWidth = laneWidth;
    gameRef.current.roadX = roadX;
    gameRef.current.player.w = Math.min(46, laneWidth * 0.52);
    gameRef.current.player.h = gameRef.current.player.w * 1.82;
    gameRef.current.player.y = height - 160;
  }, []);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, [updateCanvasDimensions]);

  // Start game action
  const startGame = useCallback(() => {
    sound.startEngine();
    sound.playTap();
    triggerHaptic(30);

    const g = gameRef.current;
    g.state = 'PLAYING';
    g.score = 0;
    g.distanceMeters = 0;
    g.nearMisses = 0;
    g.coinsCollectedThisRun = 0;
    g.topSpeed = 0;
    g.player.lane = 1.5;
    g.player.actualLane = 1.5;
    g.player.speed = 4.5;
    g.player.boostMeter = 100;
    g.player.shield = false;
    g.player.shieldTime = 0;
    g.player.invulnerableTime = 60; // 1s grace period
    g.powerUps = {
      invincibleTimer: 0,
      invincibleTotal: 480,
      multiplierTimer: 0,
      multiplierTotal: 600,
      multiplierFactor: 2,
      magnetTimer: 0,
      magnetTotal: 480,
      shield: false
    };
    g.cars = [];
    g.collectibles = [];
    g.particles = [];
    g.floatingTexts = [];
    g.spawnTimer = 0;
    g.cameraShake = 0;

    setGameState('PLAYING');
    setCurrentScore(0);
    setBoostLevel(100);
    setHasShield(false);
    setActivePowerUps({
      invincibleTimer: 0,
      invincibleTotal: 480,
      multiplierTimer: 0,
      multiplierTotal: 600,
      multiplierFactor: 1,
      magnetTimer: 0,
      magnetTotal: 480,
      shield: false
    });
  }, []);

  const togglePause = useCallback(() => {
    if (gameRef.current.state === 'PLAYING') {
      gameRef.current.state = 'PAUSED';
      setGameState('PAUSED');
      sound.stopEngine();
    } else if (gameRef.current.state === 'PAUSED') {
      gameRef.current.state = 'PLAYING';
      setGameState('PLAYING');
      sound.startEngine();
    }
  }, []);

  // Spawn traffic car with varied types, unique colors, randomized speed (3 to 6), and varying dimensions
  const spawnCar = useCallback(() => {
    const g = gameRef.current;
    const availableLanes = [0, 1, 2, 3];
    // Check lanes that don't already have a car near the top
    const safeLanes = availableLanes.filter(l => {
      return !g.cars.some(c => c.lane === l && c.y < 140);
    });

    if (safeLanes.length === 0) return;
    const lane = safeLanes[Math.floor(Math.random() * safeLanes.length)];

    // Diverse car type distribution
    const carTypePool: TrafficCarType[] = [
      'compact',
      'sedan',
      'sedan',
      'sport',
      'suv',
      'truck',
      'truck',
      'police',
      'taxi'
    ];
    const type = carTypePool[Math.floor(Math.random() * carTypePool.length)];

    // Baseline reference sizing
    const baseW = g.player.w;
    const baseH = g.player.h;

    let w = baseW;
    let h = baseH;
    let speed = 3.0 + Math.random() * 3.0; // Strictly between 3.0 and 6.0
    let color = '';
    let secondaryColor = '';
    let accentColor = '#ffffff';

    // Unique procedural high-vibrancy color generation
    const hue = Math.floor(Math.random() * 360);
    const sat = 75 + Math.floor(Math.random() * 22); // 75% - 97%
    const light = 45 + Math.floor(Math.random() * 18); // 45% - 63%
    const uniqueColor = `hsl(${hue}, ${sat}%, ${light}%)`;
    const darkAccent = `hsl(${hue}, ${sat}%, ${Math.max(15, light - 25)}%)`;
    const brightAccent = `hsl(${(hue + 30) % 360}, 95%, 75%)`;

    // Configure distinct dimensions and speeds within [3.0, 6.0] per vehicle type
    switch (type) {
      case 'compact':
        // Shorter, agile city micro-car
        w = baseW * (0.84 + Math.random() * 0.08); // ~35 - 38px
        h = baseH * (0.76 + Math.random() * 0.08); // ~58 - 64px
        speed = 3.6 + Math.random() * 2.2; // 3.6 to 5.8
        color = uniqueColor;
        secondaryColor = darkAccent;
        accentColor = brightAccent;
        break;

      case 'truck':
        // Massive long-haul semi-truck or container freight vehicle
        w = baseW * (1.12 + Math.random() * 0.1); // ~46 - 50px
        h = baseH * (1.75 + Math.random() * 0.35); // ~130 - 158px (huge obstacle!)
        speed = 3.0 + Math.random() * 1.3; // 3.0 to 4.3 (slower heavy truck)
        // Industrial freight colors
        const truckThemes = [
          { c: '#f8fafc', s: '#3b82f6', a: '#ef4444' }, // White/Blue trailer
          { c: '#ea580c', s: '#7c2d12', a: '#fbbf24' }, // Orange cargo
          { c: '#0284c7', s: '#075985', a: '#e0f2fe' }, // Deep cyan logistics
          { c: '#15803d', s: '#14532d', a: '#86efac' }, // Green freight
          { c: '#dc2626', s: '#7f1d1d', a: '#fef08a' }, // Red heavy hauler
          { c: '#475569', s: '#1e293b', a: '#f97316' }, // Dark steel container
        ];
        const tt = truckThemes[Math.floor(Math.random() * truckThemes.length)];
        color = tt.c;
        secondaryColor = tt.s;
        accentColor = tt.a;
        break;

      case 'suv':
        // Bulky, wide crossover with high road presence
        w = baseW * (1.08 + Math.random() * 0.08); // ~45 - 49px
        h = baseH * (1.12 + Math.random() * 0.1); // ~84 - 92px
        speed = 3.3 + Math.random() * 1.8; // 3.3 to 5.1
        color = uniqueColor;
        secondaryColor = '#0f172a';
        accentColor = '#cbd5e1';
        break;

      case 'sport':
        // Low slung, wide aerodynamics, high-speed racer
        w = baseW * (1.02 + Math.random() * 0.06); // ~43 - 46px
        h = baseH * (0.92 + Math.random() * 0.06); // ~68 - 74px
        speed = 4.4 + Math.random() * 1.55; // 4.4 to 5.95 (fastest traffic)
        color = uniqueColor;
        secondaryColor = '#000000';
        accentColor = brightAccent;
        break;

      case 'police':
        // Highway patrol interceptor
        w = baseW * 1.0;
        h = baseH * 1.02;
        speed = 4.0 + Math.random() * 1.8; // 4.0 to 5.8
        color = '#0b0f19'; // Black cruiser
        secondaryColor = '#f8fafc'; // White doors/roof
        accentColor = '#38bdf8';
        break;

      case 'taxi':
        // Urban yellow cab
        w = baseW * 0.98;
        h = baseH * 0.98;
        speed = 3.4 + Math.random() * 1.9; // 3.4 to 5.3
        color = '#eab308'; // Classic yellow
        secondaryColor = '#18181b';
        accentColor = '#fef08a';
        break;

      case 'sedan':
      default:
        // Standard family saloon
        w = baseW * (0.96 + Math.random() * 0.08); // ~40 - 43px
        h = baseH * (0.98 + Math.random() * 0.06); // ~73 - 78px
        speed = 3.2 + Math.random() * 2.1; // 3.2 to 5.3
        color = uniqueColor;
        secondaryColor = darkAccent;
        accentColor = brightAccent;
        break;
    }

    // Double check speed clamp strictly between 3 and 6
    speed = Math.max(3.0, Math.min(6.0, speed));

    g.cars.push({
      id: g.carIdCounter++,
      x: 0,
      y: -h - 30,
      w,
      h,
      lane,
      targetLane: lane,
      laneChangeTimer: 120 + Math.random() * 220,
      speed,
      baseSpeed: speed,
      color,
      secondaryColor,
      accentColor,
      type,
      passedPlayer: false,
      sirenTime: Math.random() * 10
    });
  }, []);

  // Spawn collectible with varied power-ups (Coin, Nitro, Shield, Invincibility, Multiplier, Magnet)
  const spawnCollectible = useCallback(() => {
    const g = gameRef.current;
    const lane = Math.floor(Math.random() * LANE_COUNT);

    const rand = Math.random();
    let type: CollectibleType = 'COIN';
    if (rand < 0.42) {
      type = 'COIN';
    } else if (rand < 0.60) {
      type = 'NITRO';
    } else if (rand < 0.74) {
      type = 'SHIELD';
    } else if (rand < 0.84) {
      type = 'MULTIPLIER'; // 2X Score Multiplier for 10s
    } else if (rand < 0.92) {
      type = 'MAGNET'; // Coin / Item Magnet for 8s
    } else {
      type = 'INVINCIBILITY'; // Overdrive Star Invincibility for 8s
    }

    g.collectibles.push({
      id: g.carIdCounter++,
      x: 0,
      y: -60,
      lane,
      type,
      collected: false,
      radius: 17,
      pulsePhase: Math.random() * Math.PI * 2
    });
  }, []);

  // Spawn explosion / crash particles
  const createExplosion = (x: number, y: number, primaryColor: string) => {
    const g = gameRef.current;
    sound.playCrash();
    triggerHaptic([60, 40, 100]);
    g.cameraShake = 24;

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      g.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        life: 1,
        maxLife: 30 + Math.random() * 25,
        color: Math.random() > 0.4 ? primaryColor : (Math.random() > 0.5 ? '#ff4400' : '#ffcc00'),
        type: Math.random() > 0.3 ? 'flame' : 'debris'
      });
    }
  };

  // Main Game Loop Update & Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const gameLoop = () => {
      const g = gameRef.current;
      const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
      const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

      // 1. UPDATE GAMEPLAY
      if (g.state === 'PLAYING') {
        const carSpec = CARS_DATA[selectedCarIndex] || CARS_DATA[0];

        // Handling Steering
        const steerSpeed = carSpec.handling;
        if (g.touch.left) {
          g.player.lane -= steerSpeed;
          g.player.targetTilt = -0.16;
        } else if (g.touch.right) {
          g.player.lane += steerSpeed;
          g.player.targetTilt = 0.16;
        } else {
          g.player.targetTilt = 0;
        }

        // Clamp lane
        g.player.lane = Math.max(0.1, Math.min(LANE_COUNT - 1.1, g.player.lane));
        g.player.actualLane += (g.player.lane - g.player.actualLane) * 0.2;
        g.player.tilt += (g.player.targetTilt - g.player.tilt) * 0.18;

        // Nitro Boost mechanics
        const isBoosting = g.touch.boost && g.player.boostMeter > 0;
        const maxBoostSpeed = carSpec.topSpeed * carSpec.boostMultiplier;
        const targetSpeed = isBoosting ? maxBoostSpeed : (5 + carSpec.topSpeed * 0.6);

        if (isBoosting) {
          g.player.speed = Math.min(g.player.speed + carSpec.acceleration * 1.5, maxBoostSpeed);
          g.player.boostMeter = Math.max(0, g.player.boostMeter - 0.45);
          // Trail particles
          if (Math.random() > 0.2) {
            const exhaustOffsetX = g.player.w * 0.26;
            [-exhaustOffsetX, exhaustOffsetX].forEach(ox => {
              g.particles.push({
                x: g.player.x + g.player.w / 2 + ox + (Math.random() - 0.5) * 4,
                y: g.player.y + g.player.h - 4,
                vx: (Math.random() - 0.5) * 1.5,
                vy: 4 + Math.random() * 4,
                size: 4 + Math.random() * 4,
                life: 1,
                maxLife: 16,
                color: Math.random() > 0.3 ? '#00e5ff' : '#60a5fa',
                type: 'flame'
              });
            });
          }
          if (Math.random() < 0.08) {
            sound.playBoost();
          }
        } else {
          g.player.speed = Math.max(g.player.speed - 0.18, 5);
          // Passive boost regeneration
          g.player.boostMeter = Math.min(100, g.player.boostMeter + 0.12);
        }

        setBoostLevel(Math.floor(g.player.boostMeter));

        // Audio updates
        const speedRatio = (g.player.speed - 5) / (maxBoostSpeed - 5);
        sound.updateEnginePitch(speedRatio, isBoosting);

        // Player x position
        g.player.x = g.roadX + g.player.actualLane * g.laneWidth + g.laneWidth / 2 - g.player.w / 2;

        // Road scroll
        g.roadY = (g.roadY + g.player.speed * 2.2) % 60;
        g.distanceMeters += g.player.speed * 0.2;

        // Traffic cars update
        g.cars.forEach(car => {
          // Cars move relative to player speed
          const relativeSpeed = (g.player.speed - car.speed) * 1.7;
          car.y += relativeSpeed;
          car.sirenTime += 0.1;

          // AI lane change logic for some cars
          car.laneChangeTimer--;
          if (car.laneChangeTimer <= 0) {
            car.laneChangeTimer = 180 + Math.random() * 200;
            if (Math.random() < 0.3) {
              const delta = Math.random() > 0.5 ? 1 : -1;
              const nextLane = car.targetLane + delta;
              if (nextLane >= 0 && nextLane < LANE_COUNT) {
                car.targetLane = nextLane;
              }
            }
          }
          car.lane += (car.targetLane - car.lane) * 0.05;
          car.x = g.roadX + car.lane * g.laneWidth + g.laneWidth / 2 - car.w / 2;

          // Near miss check (player passes traffic closely at speed)
          if (!car.passedPlayer && car.y > g.player.y && car.y < g.player.y + g.player.h) {
            car.passedPlayer = true;
            const horizontalDist = Math.abs((g.player.x + g.player.w / 2) - (car.x + car.w / 2));
            const safeDistance = (g.player.w + car.w) * 0.72;

            if (horizontalDist < safeDistance && g.player.speed > 8) {
              // Close call!
              g.nearMisses++;
              const mult = g.powerUps.multiplierTimer > 0 ? g.powerUps.multiplierFactor : 1;
              const bonus = Math.floor(50 * (g.player.speed / 7)) * mult;
              g.score += bonus;
              sound.playNearMiss();
              triggerHaptic(25);
              g.cameraShake = 6;

              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: g.player.x + g.player.w / 2,
                y: g.player.y - 20,
                text: mult > 1 ? `CLOSE CALL! +${bonus} (${mult}X)` : `CLOSE CALL! +${bonus}`,
                color: '#38bdf8',
                size: 16,
                life: 1,
                maxLife: 40
              });
            }
          }

          // Collision detection
          if (g.player.invulnerableTime <= 0 || g.powerUps.invincibleTimer > 0) {
            const hitX = Math.abs((g.player.x + g.player.w / 2) - (car.x + car.w / 2)) < (g.player.w + car.w) * 0.42;
            const hitY = Math.abs((g.player.y + g.player.h / 2) - (car.y + car.h / 2)) < (g.player.h + car.h) * 0.42;

            if (hitX && hitY) {
              if (g.powerUps.invincibleTimer > 0) {
                // OVERDRIVE INVINCIBILITY SMASH!
                sound.playSmash();
                triggerHaptic([35, 30]);
                g.cameraShake = 12;
                createExplosion(car.x + car.w / 2, car.y + car.h / 2, car.color);
                car.y = canvasHeight + 800; // eliminate car

                const mult = g.powerUps.multiplierTimer > 0 ? g.powerUps.multiplierFactor : 1;
                const smashBonus = 150 * mult;
                g.score += smashBonus;

                g.floatingTexts.push({
                  id: g.carIdCounter++,
                  x: car.x + car.w / 2,
                  y: g.player.y - 30,
                  text: mult > 1 ? `SMASHED! +${smashBonus} (${mult}X)` : `SMASHED! +${smashBonus}`,
                  color: '#fbbf24',
                  size: 19,
                  life: 1,
                  maxLife: 45
                });
              } else if (g.player.shield) {
                // Shield saves player!
                g.player.shield = false;
                g.powerUps.shield = false;
                setHasShield(false);
                g.player.invulnerableTime = 60;
                sound.playShieldPickup();
                triggerHaptic([40, 40]);

                // Destroy obstacle car
                createExplosion(car.x + car.w / 2, car.y + car.h / 2, car.color);
                car.y = canvasHeight + 500; // remove car

                g.floatingTexts.push({
                  id: g.carIdCounter++,
                  x: g.player.x + g.player.w / 2,
                  y: g.player.y - 30,
                  text: 'SHIELD DEFLECTED!',
                  color: '#10b981',
                  size: 18,
                  life: 1,
                  maxLife: 45
                });
              } else {
                // Fatal Collision -> Game Over
                createExplosion(g.player.x + g.player.w / 2, g.player.y + g.player.h / 2, carSpec.color);
                g.state = 'GAMEOVER';
                setGameState('GAMEOVER');

                const finalScore = Math.floor(g.score);
                const prevBest = parseInt(localStorage.getItem('miniracer_highscore') || '0', 10);
                const isNewRecord = finalScore > prevBest;
                if (isNewRecord) {
                  localStorage.setItem('miniracer_highscore', finalScore.toString());
                  setHighScore(finalScore);
                }

                const prevCoins = parseInt(localStorage.getItem('miniracer_coins') || '0', 10);
                const updatedTotalCoins = prevCoins + g.coinsCollectedThisRun;
                localStorage.setItem('miniracer_coins', updatedTotalCoins.toString());
                setTotalCoins(updatedTotalCoins);

                setStats({
                  score: finalScore,
                  highScore: Math.max(finalScore, prevBest),
                  coinsCollected: g.coinsCollectedThisRun,
                  totalCoins: updatedTotalCoins,
                  distanceKm: parseFloat((g.distanceMeters / 1000).toFixed(2)),
                  nearMisses: g.nearMisses,
                  maxSpeedKmh: Math.floor(g.topSpeed * 18),
                  boostDurationSec: 0
                });
              }
            }
          }
        });

        // Filter offscreen cars
        g.cars = g.cars.filter(c => c.y > -200 && c.y < canvasHeight + 150);

        // Coin & Powerup Magnet attraction logic
        if (g.powerUps.magnetTimer > 0) {
          g.collectibles.forEach(item => {
            if (item.collected) return;
            const dx = (g.player.x + g.player.w / 2) - item.x;
            const dy = (g.player.y + g.player.h / 2) - item.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 340 && dist > 1) {
              item.x += (dx / dist) * 7.5;
              item.y += (dy / dist) * 7.5;
              if (Math.random() < 0.2) {
                g.particles.push({
                  x: item.x,
                  y: item.y,
                  vx: (dx / dist) * 2,
                  vy: (dy / dist) * 2,
                  size: 2.5,
                  life: 1,
                  maxLife: 12,
                  color: '#38bdf8',
                  type: 'spark'
                });
              }
            }
          });
        }

        // Collectibles update & pickup collision
        g.collectibles.forEach(item => {
          const relSpeed = g.player.speed * 1.8;
          item.y += relSpeed;
          item.pulsePhase += 0.08;
          if (g.powerUps.magnetTimer <= 0) {
            item.x = g.roadX + item.lane * g.laneWidth + g.laneWidth / 2;
          }

          // Pickup collision
          const dist = Math.hypot((g.player.x + g.player.w / 2) - item.x, (g.player.y + g.player.h / 2) - item.y);
          if (!item.collected && dist < item.radius + g.player.w * 0.48) {
            item.collected = true;
            triggerHaptic(20);

            const mult = g.powerUps.multiplierTimer > 0 ? g.powerUps.multiplierFactor : 1;

            if (item.type === 'COIN') {
              sound.playCoin();
              g.coinsCollectedThisRun++;
              const coinPoints = 25 * mult;
              g.score += coinPoints;
              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: item.x,
                y: item.y - 15,
                text: mult > 1 ? `+${coinPoints} COIN (${mult}X)` : `+${coinPoints} COIN`,
                color: '#facc15',
                size: 15,
                life: 1,
                maxLife: 35
              });
            } else if (item.type === 'NITRO') {
              sound.playBoost();
              g.player.boostMeter = Math.min(100, g.player.boostMeter + 60);
              setBoostLevel(Math.floor(g.player.boostMeter));
              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: item.x,
                y: item.y - 15,
                text: 'NITRO REFILLED!',
                color: '#00e5ff',
                size: 16,
                life: 1,
                maxLife: 35
              });
            } else if (item.type === 'SHIELD') {
              sound.playShieldPickup();
              g.player.shield = true;
              g.powerUps.shield = true;
              setHasShield(true);
              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: item.x,
                y: item.y - 15,
                text: 'SHIELD ARMED!',
                color: '#34d399',
                size: 16,
                life: 1,
                maxLife: 40
              });
            } else if (item.type === 'INVINCIBILITY') {
              sound.playPowerUp();
              g.powerUps.invincibleTimer = 480; // 8 seconds
              g.cameraShake = 8;
              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: item.x,
                y: item.y - 15,
                text: 'OVERDRIVE INVINCIBLE!',
                color: '#f59e0b',
                size: 18,
                life: 1,
                maxLife: 50
              });
            } else if (item.type === 'MULTIPLIER') {
              sound.playPowerUp();
              g.powerUps.multiplierTimer = 600; // 10 seconds
              g.powerUps.multiplierFactor = 2;
              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: item.x,
                y: item.y - 15,
                text: '2X SCORE MULTIPLIER!',
                color: '#a855f7',
                size: 18,
                life: 1,
                maxLife: 50
              });
            } else if (item.type === 'MAGNET') {
              sound.playPowerUp();
              g.powerUps.magnetTimer = 480; // 8 seconds
              g.floatingTexts.push({
                id: g.carIdCounter++,
                x: item.x,
                y: item.y - 15,
                text: 'COIN MAGNET ACTIVE!',
                color: '#06b6d4',
                size: 17,
                life: 1,
                maxLife: 45
              });
            }
          }
        });

        // Power-up active timer decrement
        if (g.powerUps.invincibleTimer > 0) g.powerUps.invincibleTimer--;
        if (g.powerUps.multiplierTimer > 0) g.powerUps.multiplierTimer--;
        if (g.powerUps.magnetTimer > 0) g.powerUps.magnetTimer--;

        // Sync powerups to React state every 6 frames
        if (Math.floor(g.score * 10) % 6 === 0) {
          setActivePowerUps({
            invincibleTimer: g.powerUps.invincibleTimer,
            invincibleTotal: 480,
            multiplierTimer: g.powerUps.multiplierTimer,
            multiplierTotal: 600,
            multiplierFactor: g.powerUps.multiplierFactor,
            magnetTimer: g.powerUps.magnetTimer,
            magnetTotal: 480,
            shield: g.player.shield
          });
        }

        g.collectibles = g.collectibles.filter(item => !item.collected && item.y < canvasHeight + 100);

        // Spawn Timers
        g.spawnTimer++;
        const spawnInterval = Math.max(28, 55 - Math.floor(g.player.speed * 1.5));
        if (g.spawnTimer > spawnInterval) {
          spawnCar();
          g.spawnTimer = 0;
        }

        g.collectibleTimer++;
        if (g.collectibleTimer > 130) {
          spawnCollectible();
          g.collectibleTimer = 0;
        }

        // Score progression
        g.score += g.player.speed * 0.055;
        setCurrentScore(Math.floor(g.score));

        const kmh = Math.floor(g.player.speed * 18);
        setCurrentSpeedKmh(kmh);
        if (g.player.speed > g.topSpeed) {
          g.topSpeed = g.player.speed;
        }

        if (g.player.invulnerableTime > 0) {
          g.player.invulnerableTime--;
        }
      }

      // Camera shake decay
      if (g.cameraShake > 0) {
        g.cameraShake *= 0.88;
        if (g.cameraShake < 0.2) g.cameraShake = 0;
      }

      // 2. RENDER PASS
      ctx.save();
      if (g.cameraShake > 0) {
        const shakeX = (Math.random() - 0.5) * g.cameraShake;
        const shakeY = (Math.random() - 0.5) * g.cameraShake;
        ctx.translate(shakeX, shakeY);
      }

      // Clear canvas
      ctx.clearRect(-20, -20, canvasWidth + 40, canvasHeight + 40);

      const activeTheme = THEMES[settings.theme] || THEMES.neon_midnight;

      // Draw Landscape / Shoulder Grass
      ctx.fillStyle = activeTheme.grassColor;
      ctx.fillRect(0, 0, g.roadX, canvasHeight);
      ctx.fillRect(g.roadX + g.roadWidth, 0, canvasWidth - (g.roadX + g.roadWidth), canvasHeight);

      // Ambient roadside markers, vegetation & structures
      const poleSpacing = 85;
      const poleOffset = (g.roadY * 1.5) % poleSpacing;
      const pattern = activeTheme.shoulderPattern || 'beacons';

      for (let py = -poleSpacing + poleOffset; py < canvasHeight + poleSpacing; py += poleSpacing) {
        if (pattern === 'pines') {
          // Autumn Pine Trees
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.moveTo(g.roadX - 22, py + 16);
          ctx.lineTo(g.roadX - 12, py);
          ctx.lineTo(g.roadX - 2, py + 16);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(g.roadX + g.roadWidth + 2, py + 16);
          ctx.lineTo(g.roadX + g.roadWidth + 12, py);
          ctx.lineTo(g.roadX + g.roadWidth + 22, py + 16);
          ctx.fill();
        } else if (pattern === 'palms') {
          // Coastal Palm markers
          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.arc(g.roadX - 12, py + 8, 7, 0, Math.PI * 2);
          ctx.arc(g.roadX + g.roadWidth + 12, py + 8, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (pattern === 'cacti') {
          // Desert Cacti
          ctx.fillStyle = '#15803d';
          ctx.fillRect(g.roadX - 14, py + 2, 4, 16);
          ctx.fillRect(g.roadX - 18, py + 6, 4, 6);
          ctx.fillRect(g.roadX + g.roadWidth + 10, py + 2, 4, 16);
          ctx.fillRect(g.roadX + g.roadWidth + 14, py + 6, 4, 6);
        } else if (pattern === 'snowdrifts') {
          // Snowy mounds
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(g.roadX - 12, py + 8, 8, 0, Math.PI * 2);
          ctx.arc(g.roadX + g.roadWidth + 12, py + 8, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (pattern === 'cyber_pillars') {
          // Synthwave Holographic rods
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(g.roadX - 14, py, 4, 22);
          ctx.fillStyle = '#ec4899';
          ctx.fillRect(g.roadX + g.roadWidth + 10, py, 4, 22);
        } else {
          // Modern Highway Beacons
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(g.roadX - 14, py, 6, 12);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(g.roadX - 11, py + 3, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#1e293b';
          ctx.fillRect(g.roadX + g.roadWidth + 8, py, 6, 12);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(g.roadX + g.roadWidth + 11, py + 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rumble Strips / Curbs
      const curbWidth = 10;
      const curbSegment = 24;
      const curbOffset = (g.roadY * 1.8) % (curbSegment * 2);

      for (let cy = -curbSegment * 2 + curbOffset; cy < canvasHeight + curbSegment; cy += curbSegment) {
        const isAlt = Math.floor((cy - curbOffset) / curbSegment) % 2 === 0;
        ctx.fillStyle = isAlt ? activeTheme.curbColorA : activeTheme.curbColorB;

        // Left curb
        ctx.fillRect(g.roadX - curbWidth, cy, curbWidth, curbSegment);
        // Right curb
        ctx.fillRect(g.roadX + g.roadWidth, cy, curbWidth, curbSegment);
      }

      // Asphalt Road Surface
      ctx.fillStyle = activeTheme.roadColor;
      ctx.fillRect(g.roadX, 0, g.roadWidth, canvasHeight);

      // Subtle asphalt grain texture lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const xPos = g.roadX + (g.roadWidth / 7) * (i + 1);
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, canvasHeight);
        ctx.stroke();
      }

      // Lane Dash Lines
      ctx.strokeStyle = activeTheme.stripeColor;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([28, 28]);
      ctx.lineDashOffset = -g.roadY * 1.5;

      for (let i = 1; i < LANE_COUNT; i++) {
        const lx = g.roadX + i * g.laneWidth;
        ctx.beginPath();
        ctx.moveTo(lx, -60);
        ctx.lineTo(lx, canvasHeight + 60);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Speed lines when nitro boosting
      if (g.state === 'PLAYING' && g.touch.boost && g.player.boostMeter > 0) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.28)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const sx = g.roadX + Math.random() * g.roadWidth;
          const sy = Math.random() * canvasHeight;
          const len = 40 + Math.random() * 80;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + len);
          ctx.stroke();
        }
      }

      // Ambient Weather Systems
      const weather = activeTheme.weather || 'clear';
      if (weather === 'snow') {
        // Alpine snowfall
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let i = 0; i < 24; i++) {
          const sx = (Math.sin(i * 99 + Date.now() * 0.001) * 0.5 + 0.5) * canvasWidth;
          const sy = (Date.now() * 0.16 + i * 42) % canvasHeight;
          ctx.beginPath();
          ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weather === 'rain') {
        // Tokyo night rain streaks
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 35; i++) {
          const rx = (Math.sin(i * 123) * 0.5 + 0.5) * canvasWidth;
          const ry = (Date.now() * 0.95 + i * 48) % canvasHeight;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 18);
          ctx.stroke();
        }
      } else if (weather === 'sand') {
        // Canyon desert dust
        ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
        for (let i = 0; i < 18; i++) {
          const dx = (Date.now() * 0.22 + i * 75) % canvasWidth;
          const dy = (Math.cos(i * 47) * 0.5 + 0.5) * canvasHeight;
          ctx.beginPath();
          ctx.arc(dx, dy, 3 + (i % 4), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weather === 'leaves') {
        // Autumn Ridge falling leaves
        ctx.fillStyle = 'rgba(249, 115, 22, 0.75)';
        for (let i = 0; i < 18; i++) {
          const lx = (Math.sin(i * 77 + Date.now() * 0.002) * 0.5 + 0.5) * canvasWidth;
          const ly = (Date.now() * 0.2 + i * 50) % canvasHeight;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 4.5, 2.5, Math.sin(Date.now() * 0.003 + i), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (weather === 'grid_stars') {
        // Synthwave retro stars
        ctx.fillStyle = 'rgba(236, 72, 153, 0.55)';
        for (let i = 0; i < 22; i++) {
          const px = (Math.sin(i * 333) * 0.5 + 0.5) * canvasWidth;
          const py = (Math.cos(i * 777) * 0.5 + 0.5) * canvasHeight;
          ctx.fillRect(px, py, 2.5, 2.5);
        }
      }

      // Render Collectibles
      g.collectibles.forEach(item => {
        const pulse = Math.sin(item.pulsePhase) * 2.5;
        const rad = item.radius + pulse;

        ctx.save();
        ctx.translate(item.x, item.y);

        if (item.type === 'COIN') {
          // Spinning gold coin
          const spinScale = Math.cos(item.pulsePhase * 1.5);
          ctx.scale(spinScale, 1);
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fillStyle = '#eab308';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#fef08a';
          ctx.stroke();

          // Coin core symbol
          ctx.fillStyle = '#713f12';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 1);
        } else if (item.type === 'NITRO') {
          // Nitro canister
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(-8, -14, 16, 28);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-6, -12, 12, 24);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3, -16, 6, 4);

          // Lightning Bolt glyph
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', 0, 1);
        } else if (item.type === 'SHIELD') {
          // Force field energy orb
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡️', 0, 0);
        } else if (item.type === 'INVINCIBILITY') {
          // Overdrive Star Invincibility
          const rot = item.pulsePhase * 2;
          ctx.rotate(rot);

          // Outer radiant aura
          const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, rad * 1.3);
          auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
          auraGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)');
          auraGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, rad * 1.3, 0, Math.PI * 2);
          ctx.fill();

          // 5-Point Golden Star
          ctx.fillStyle = '#fef08a';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * rad, -Math.sin(((18 + s * 72) * Math.PI) / 180) * rad);
            ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * (rad * 0.5), -Math.sin(((54 + s * 72) * Math.PI) / 180) * (rad * 0.5));
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (item.type === 'MULTIPLIER') {
          // 2X Score Multiplier Orb
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'black 11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('2X', 0, 0.5);
        } else if (item.type === 'MAGNET') {
          // Coin Magnet Power-up
          ctx.beginPath();
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🧲', 0, 0);
        }
        ctx.restore();
      });

      // Render Traffic Cars with rich, distinctive models & varying dimensions
      g.cars.forEach(car => {
        ctx.save();
        ctx.translate(car.x + car.w / 2, car.y + car.h / 2);

        // Soft ground shadow under vehicle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(-car.w / 2 + 2, -car.h / 2 + 4, car.w, car.h, 6);
        ctx.fill();

        if (car.type === 'truck') {
          // ==================== SEMI-TRUCK / BIG RIG ====================
          // Rear tandem dual wheels
          ctx.fillStyle = '#0f172a';
          const twW = 5;
          const twH = 14;
          // Front steering wheels
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 24, twW, twH);
          ctx.fillRect(car.w / 2 - twW + 2, car.h / 2 - 24, twW, twH);
          // Trailer tandem wheels 1
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 18, twW, twH);
          ctx.fillRect(car.w / 2 - twW + 2, -car.h / 2 + 18, twW, twH);
          // Trailer tandem wheels 2
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 36, twW, twH);
          ctx.fillRect(car.w / 2 - twW + 2, -car.h / 2 + 36, twW, twH);

          // Cab (front of truck, moving downwards)
          const cabHeight = car.h * 0.28;
          const cabY = car.h / 2 - cabHeight;
          ctx.fillStyle = car.secondaryColor || '#1e293b';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, cabY, car.w, cabHeight, [0, 0, 8, 8]);
          ctx.fill();

          // Cab Windshield
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-car.w / 2 + 4, cabY + 6, car.w - 8, 8);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(-car.w / 2 + 6, cabY + 7, car.w - 12, 3);

          // Headlights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 3, 8, 3);
          ctx.fillRect(car.w / 2 - 12, car.h / 2 - 3, 8, 3);

          // Trailer Body (cargo container)
          const trailerHeight = car.h * 0.66;
          const trailerY = -car.h / 2;
          ctx.fillStyle = car.color;
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, trailerY, car.w, trailerHeight, [6, 6, 2, 2]);
          ctx.fill();

          // Trailer roof corrugation lines
          ctx.strokeStyle = 'rgba(0,0,0,0.18)';
          ctx.lineWidth = 1.5;
          for (let ry = trailerY + 12; ry < trailerY + trailerHeight - 8; ry += 14) {
            ctx.beginPath();
            ctx.moveTo(-car.w / 2 + 4, ry);
            ctx.lineTo(car.w / 2 - 4, ry);
            ctx.stroke();
          }

          // Cargo company accent stripe
          ctx.fillStyle = car.accentColor || '#ef4444';
          ctx.fillRect(-car.w / 2, trailerY + trailerHeight / 2 - 4, car.w, 8);

          // Rear hazard chevrons (top of truck moving down, so rear is at -car.h/2)
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-car.w / 2 + 3, trailerY, 7, 3);
          ctx.fillRect(car.w / 2 - 10, trailerY, 7, 3);
        } else if (car.type === 'compact') {
          // ==================== COMPACT HATCHBACK ====================
          // Wheels
          ctx.fillStyle = '#0f172a';
          const cwW = 4;
          const cwH = 11;
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 8, cwW, cwH);
          ctx.fillRect(car.w / 2 - cwW + 2, -car.h / 2 + 8, cwW, cwH);
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 18, cwW, cwH);
          ctx.fillRect(car.w / 2 - cwW + 2, car.h / 2 - 18, cwW, cwH);

          // Rounded body
          ctx.fillStyle = car.color;
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 10);
          ctx.fill();

          // Bubble roof
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2 + 4, -car.h / 2 + 10, car.w - 8, car.h * 0.48, 6);
          ctx.fill();

          // Large rear hatch window
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(-car.w / 2 + 6, -car.h / 2 + 12, car.w - 12, 6);

          // Headlights
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(-car.w / 2 + 6, car.h / 2 - 2, 4, 0, Math.PI * 2);
          ctx.arc(car.w / 2 - 6, car.h / 2 - 2, 4, 0, Math.PI * 2);
          ctx.fill();

          // Taillights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-car.w / 2 + 3, -car.h / 2, 6, 3);
          ctx.fillRect(car.w / 2 - 9, -car.h / 2, 6, 3);
        } else if (car.type === 'suv') {
          // ==================== LUXURY SUV / CROSSOVER ====================
          // Sturdy wheels
          ctx.fillStyle = '#0f172a';
          const swW = 5;
          const swH = 14;
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 12, swW, swH);
          ctx.fillRect(car.w / 2 - swW + 2, -car.h / 2 + 12, swW, swH);
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 24, swW, swH);
          ctx.fillRect(car.w / 2 - swW + 2, car.h / 2 - 24, swW, swH);

          // Muscular SUV body
          ctx.fillStyle = car.color;
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 7);
          ctx.fill();

          // Dark side moldings
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-car.w / 2, -car.h / 2 + 4, 2, car.h - 8);
          ctx.fillRect(car.w / 2 - 2, -car.h / 2 + 4, 2, car.h - 8);

          // Roof rack rails
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-car.w / 2 + 5, -car.h / 2 + 18, 2.5, car.h * 0.46);
          ctx.fillRect(car.w / 2 - 7.5, -car.h / 2 + 18, 2.5, car.h * 0.46);

          // Cabin glass
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2 + 6, -car.h / 2 + 18, car.w - 12, car.h * 0.44, 4);
          ctx.fill();

          // Sunroof
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-car.w / 2 + 10, -car.h / 2 + 22, car.w - 20, 10);

          // Headlights
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 3, 8, 3);
          ctx.fillRect(car.w / 2 - 12, car.h / 2 - 3, 8, 3);

          // Taillights
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2, 8, 3);
          ctx.fillRect(car.w / 2 - 12, -car.h / 2, 8, 3);
        } else if (car.type === 'sport') {
          // ==================== EXOTIC RACER / SPORT ====================
          // Wide low-profile wheels
          ctx.fillStyle = '#020617';
          const spW = 5;
          const spH = 13;
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 12, spW, spH);
          ctx.fillRect(car.w / 2 - spW + 2, -car.h / 2 + 12, spW, spH);
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 22, spW, spH);
          ctx.fillRect(car.w / 2 - spW + 2, car.h / 2 - 22, spW, spH);

          // Sculpted body
          ctx.fillStyle = car.color;
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 8);
          ctx.fill();

          // Twin racing stripes
          ctx.fillStyle = car.accentColor || '#ffffff';
          ctx.fillRect(-4, -car.h / 2, 3, car.h);
          ctx.fillRect(1, -car.h / 2, 3, car.h);

          // Aerodynamic cockpit
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2 + 5, -car.h / 2 + 16, car.w - 10, car.h * 0.42, 5);
          ctx.fill();

          // Rear carbon wing
          ctx.fillStyle = '#020617';
          ctx.fillRect(-car.w / 2 + 3, -car.h / 2 - 2, car.w - 6, 4);

          // Xenon headlights
          ctx.fillStyle = '#fde047';
          ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 3, 7, 3);
          ctx.fillRect(car.w / 2 - 11, car.h / 2 - 3, 7, 3);

          // Taillights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2, 7, 3);
          ctx.fillRect(car.w / 2 - 11, -car.h / 2, 7, 3);
        } else if (car.type === 'police') {
          // ==================== POLICE PATROL CRUISER ====================
          ctx.fillStyle = '#0f172a';
          const pw = 4;
          const ph = 12;
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 10, pw, ph);
          ctx.fillRect(car.w / 2 - pw + 2, -car.h / 2 + 10, pw, ph);
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 22, pw, ph);
          ctx.fillRect(car.w / 2 - pw + 2, car.h / 2 - 22, pw, ph);

          // Black body
          ctx.fillStyle = '#0b0f19';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 7);
          ctx.fill();

          // White roof & door panels
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 14, car.w - 8, car.h * 0.46);

          // Cockpit
          ctx.fillStyle = '#090d16';
          ctx.fillRect(-car.w / 2 + 6, -car.h / 2 + 16, car.w - 12, car.h * 0.42);

          // Alternate flashing police light bar
          const flash = Math.sin(car.sirenTime * 10) > 0;
          ctx.fillStyle = flash ? '#ef4444' : '#0284c7';
          ctx.fillRect(-7, -car.h / 2 + car.h * 0.36, 6, 4);
          ctx.fillStyle = flash ? '#0284c7' : '#ef4444';
          ctx.fillRect(1, -car.h / 2 + car.h * 0.36, 6, 4);

          // Headlights & Taillights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 3, 7, 3);
          ctx.fillRect(car.w / 2 - 11, car.h / 2 - 3, 7, 3);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2, 7, 3);
          ctx.fillRect(car.w / 2 - 11, -car.h / 2, 7, 3);
        } else if (car.type === 'taxi') {
          // ==================== YELLOW TAXI ====================
          ctx.fillStyle = '#0f172a';
          const tw = 4;
          const th = 12;
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 10, tw, th);
          ctx.fillRect(car.w / 2 - tw + 2, -car.h / 2 + 10, tw, th);
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 22, tw, th);
          ctx.fillRect(car.w / 2 - tw + 2, car.h / 2 - 22, tw, th);

          // Yellow body
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 7);
          ctx.fill();

          // Checkerboard stripe on roof
          ctx.fillStyle = '#18181b';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 14, car.w - 8, 4);
          ctx.fillStyle = '#ffffff';
          for (let cx = -car.w / 2 + 4; cx < car.w / 2 - 4; cx += 6) {
            ctx.fillRect(cx, -car.h / 2 + 14, 3, 4);
          }

          // Cockpit
          ctx.fillStyle = '#090d16';
          ctx.fillRect(-car.w / 2 + 5, -car.h / 2 + 20, car.w - 10, car.h * 0.38);

          // TAXI roof sign
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-8, -car.h / 2 + car.h * 0.36, 16, 5);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 6px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('TAXI', 0, -car.h / 2 + car.h * 0.36 + 4);

          // Headlights & Taillights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 3, 7, 3);
          ctx.fillRect(car.w / 2 - 11, car.h / 2 - 3, 7, 3);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2, 7, 3);
          ctx.fillRect(car.w / 2 - 11, -car.h / 2, 7, 3);
        } else {
          // ==================== STANDARD SEDAN ====================
          ctx.fillStyle = '#0f172a';
          const wW = 4;
          const wH = 12;
          ctx.fillRect(-car.w / 2 - 2, -car.h / 2 + 10, wW, wH);
          ctx.fillRect(car.w / 2 - wW + 2, -car.h / 2 + 10, wW, wH);
          ctx.fillRect(-car.w / 2 - 2, car.h / 2 - 22, wW, wH);
          ctx.fillRect(car.w / 2 - wW + 2, car.h / 2 - 22, wW, wH);

          // Body
          ctx.fillStyle = car.color;
          ctx.beginPath();
          ctx.roundRect(-car.w / 2, -car.h / 2, car.w, car.h, 7);
          ctx.fill();

          // Cockpit glass
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.roundRect(-car.w / 2 + 5, -car.h / 2 + 16, car.w - 10, car.h * 0.44, 4);
          ctx.fill();

          // Windshield reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(-car.w / 2 + 7, -car.h / 2 + 19, car.w - 14, 5);

          // Headlights
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-car.w / 2 + 4, car.h / 2 - 3, 7, 3);
          ctx.fillRect(car.w / 2 - 11, car.h / 2 - 3, 7, 3);

          // Taillights
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-car.w / 2 + 4, -car.h / 2, 7, 3);
          ctx.fillRect(car.w / 2 - 11, -car.h / 2, 7, 3);
        }

        ctx.restore();
      });

      // Render Player Car (if playing or game over)
      if (g.state === 'PLAYING' || g.state === 'PAUSED' || (g.state === 'GAMEOVER' && g.player.speed > 0)) {
        const carSpec = CARS_DATA[selectedCarIndex] || CARS_DATA[0];

        ctx.save();
        ctx.translate(g.player.x + g.player.w / 2, g.player.y + g.player.h / 2);
        ctx.rotate(g.player.tilt);

        // Flicker if invulnerable
        if (g.player.invulnerableTime > 0 && Math.floor(g.player.invulnerableTime / 4) % 2 === 0) {
          ctx.globalAlpha = 0.4;
        }

        // Dynamic Headlight Beam forward onto road
        const beamGrad = ctx.createLinearGradient(0, 0, 0, -180);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(-16, -g.player.h / 2);
        ctx.lineTo(-45, -g.player.h / 2 - 180);
        ctx.lineTo(45, -g.player.h / 2 - 180);
        ctx.lineTo(16, -g.player.h / 2);
        ctx.closePath();
        ctx.fill();

        // Car Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(-g.player.w / 2 + 4, -g.player.h / 2 + 8, g.player.w, g.player.h, 8);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#0f172a';
        const pwW = 5;
        const pwH = 14;
        ctx.fillRect(-g.player.w / 2 - 2, -g.player.h / 2 + 10, pwW, pwH);
        ctx.fillRect(g.player.w / 2 - pwW + 2, -g.player.h / 2 + 10, pwW, pwH);
        ctx.fillRect(-g.player.w / 2 - 2, g.player.h / 2 - 24, pwW, pwH);
        ctx.fillRect(g.player.w / 2 - pwW + 2, g.player.h / 2 - 24, pwW, pwH);

        // Chassis Main Body
        ctx.fillStyle = carSpec.color;
        ctx.beginPath();
        ctx.roundRect(-g.player.w / 2, -g.player.h / 2, g.player.w, g.player.h, 9);
        ctx.fill();

        // Aerodynamic racing stripes
        ctx.fillStyle = carSpec.secondaryColor;
        ctx.fillRect(-g.player.w * 0.18, -g.player.h / 2, g.player.w * 0.36, g.player.h);

        // Cockpit glass
        ctx.fillStyle = carSpec.roofColor;
        ctx.beginPath();
        ctx.roundRect(-g.player.w / 2 + 5, -g.player.h / 2 + 16, g.player.w - 10, g.player.h * 0.44, 5);
        ctx.fill();

        // Front Windshield glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-g.player.w / 2 + 7, -g.player.h / 2 + 18, g.player.w - 14, 5);

        // Rear Wing / Spoiler
        ctx.fillStyle = carSpec.color;
        ctx.fillRect(-g.player.w / 2 + 3, g.player.h / 2 - 7, g.player.w - 6, 5);

        // Front Headlights
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-g.player.w / 2 + 4, -g.player.h / 2, 7, 3);
        ctx.fillRect(g.player.w / 2 - 11, -g.player.h / 2, 7, 3);

        // Rear glowing taillights
        ctx.fillStyle = '#ff1a1a';
        ctx.fillRect(-g.player.w / 2 + 4, g.player.h / 2 - 2, 7, 3);
        ctx.fillRect(g.player.w / 2 - 11, g.player.h / 2 - 2, 7, 3);

        // Active Shield Force Bubble
        if (g.player.shield) {
          ctx.beginPath();
          ctx.arc(0, 0, g.player.h * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#34d399';
          ctx.stroke();
        }

        // Active Invincibility Rainbow Flare
        if (g.powerUps.invincibleTimer > 0) {
          const rainbowHue = Math.floor(Date.now() / 4) % 360;
          ctx.beginPath();
          ctx.arc(0, 0, g.player.h * 0.68, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${rainbowHue}, 100%, 60%, 0.25)`;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = `hsl(${rainbowHue}, 100%, 70%)`;
          ctx.stroke();

          // Star sparks
          if (Math.random() < 0.4) {
            g.particles.push({
              x: g.player.x + Math.random() * g.player.w,
              y: g.player.y + Math.random() * g.player.h,
              vx: (Math.random() - 0.5) * 3,
              vy: 3 + Math.random() * 3,
              size: 3 + Math.random() * 3,
              life: 1,
              maxLife: 20,
              color: `hsl(${rainbowHue}, 100%, 65%)`,
              type: 'star'
            });
          }
        }

        // Active 2X Multiplier Halo
        if (g.powerUps.multiplierTimer > 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'black 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('2X ACTIVE', 0, -g.player.h / 2 - 8);
        }

        // Active Magnet Flux Ring
        if (g.powerUps.magnetTimer > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, g.player.h * 0.8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }

      // Live Telemetry Callback to Desktop Console
      if (onTelemetryUpdate && Math.floor(g.score * 10) % 3 === 0) {
        const carSpec = CARS_DATA[selectedCarIndex] || CARS_DATA[0];
        const kmh = Math.floor(g.player.speed * 18);
        const gear = Math.min(6, Math.max(1, Math.floor(g.player.speed / 2.6)));
        const rpm = Math.floor(2200 + (g.player.speed / carSpec.topSpeed) * 6200 + (g.touch.boost ? 1400 : 0));
        const gForce = parseFloat((g.player.tilt * 8.5).toFixed(2));
        onTelemetryUpdate({
          speedKmh: kmh,
          boost: Math.floor(g.player.boostMeter),
          score: Math.floor(g.score),
          highScore: Math.max(Math.floor(g.score), highScore),
          gear,
          rpm,
          gForce,
          shield: g.player.shield,
          state: g.state
        });
      }

      // Particles render & update
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) {
          g.particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floating Texts render & update
      for (let i = g.floatingTexts.length - 1; i >= 0; i--) {
        const ft = g.floatingTexts[i];
        ft.y -= 1.4;
        ft.life -= 1 / ft.maxLife;

        if (ft.life <= 0) {
          g.floatingTexts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life * 1.5);
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore(); // restore camera shake

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [selectedCarIndex, settings.theme, spawnCar, spawnCollectible]);

  // Touch handlers for ergonomic on-screen buttons
  const setTouch = (btn: 'left' | 'right' | 'boost', state: boolean) => {
    gameRef.current.touch[btn] = state;
    if (state) {
      triggerHaptic(15);
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#07090e] text-white overflow-hidden select-none touch-none font-sans flex flex-col items-center justify-center">
      {/* Game Canvas Container */}
      <div className="relative w-full h-full max-w-xl flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* TOP BAR / HUD */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          {/* Left: Speedometer & Distance */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Speed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono tracking-tight tabular-nums text-white">
                  {currentSpeedKmh}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">km/h</span>
              </div>
            </div>

            {hasShield && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHIELD</span>
              </div>
            )}
          </div>

          {/* Center: Live Score & High Score */}
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold font-mono tracking-tight tabular-nums text-cyan-400 drop-shadow-[0_2px_10px_rgba(6,182,212,0.6)]">
              {currentScore}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>BEST:</span>
              <span className="font-mono tabular-nums text-slate-200 font-semibold">{highScore}</span>
            </div>
          </div>

          {/* Right: Sound & Pause Actions */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleMute}
              className="w-10 h-10 rounded-xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-transform"
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {gameState === 'PLAYING' && (
              <button
                onClick={togglePause}
                className="w-10 h-10 rounded-xl bg-slate-900/70 border border-slate-700/60 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-transform"
                aria-label="Pause Game"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE POWER-UPS TRAY */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-16 left-4 right-4 z-20 flex flex-wrap items-center justify-center gap-2 pointer-events-none">
            {activePowerUps.invincibleTimer > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/25 border border-amber-400/80 text-amber-300 text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse">
                <span>★</span>
                <span>OVERDRIVE INVINCIBLE</span>
                <span className="font-mono tabular-nums text-white">
                  {Math.ceil(activePowerUps.invincibleTimer / 60)}s
                </span>
              </div>
            )}

            {activePowerUps.multiplierTimer > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/25 border border-purple-400/80 text-purple-300 text-xs font-bold shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                <span>⚡</span>
                <span>2X MULTIPLIER</span>
                <span className="font-mono tabular-nums text-white">
                  {Math.ceil(activePowerUps.multiplierTimer / 60)}s
                </span>
              </div>
            )}

            {activePowerUps.magnetTimer > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/25 border border-cyan-400/80 text-cyan-300 text-xs font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                <span>🧲</span>
                <span>COIN MAGNET</span>
                <span className="font-mono tabular-nums text-white">
                  {Math.ceil(activePowerUps.magnetTimer / 60)}s
                </span>
              </div>
            )}
          </div>
        )}

        {/* NITRO BOOST METER (Anchored above thumb controls during gameplay) */}
        {gameState === 'PLAYING' && (
          <div className="absolute bottom-28 left-6 right-6 z-20 pointer-events-none flex flex-col items-center">
            <div className="w-full max-w-xs flex items-center justify-between text-[11px] font-semibold text-cyan-300 mb-1 px-1 drop-shadow">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                NITRO BOOST
              </span>
              <span className="font-mono">{boostLevel}%</span>
            </div>
            <div className="w-full max-w-xs h-2 bg-slate-900/80 rounded-full border border-cyan-500/30 overflow-hidden backdrop-blur-sm shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-white transition-all duration-75"
                style={{ width: `${boostLevel}%` }}
              />
            </div>
          </div>
        )}

        {/* DESKTOP KEYBOARD HINTS (Shown when on desktop mode with touch controls hidden) */}
        {viewMode === 'desktop' && !showTouchControls && (
          <div className="absolute bottom-5 left-0 right-0 z-20 flex items-center justify-center gap-3 text-xs text-slate-400 font-mono pointer-events-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-slate-700/60 backdrop-blur-sm">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-bold text-[10px]">A</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-bold text-[10px]">D</kbd>
              <span>STEER</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-cyan-500/40 text-cyan-300 backdrop-blur-sm">
              <kbd className="px-2 py-0.5 rounded bg-cyan-600/80 text-white font-bold text-[10px]">SPACE</kbd>
              <span>NITRO</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-slate-700/60 backdrop-blur-sm">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-bold text-[10px]">P</kbd>
              <span>PAUSE</span>
            </div>
          </div>
        )}

        {/* MOBILE ON-SCREEN THUMB CONTROLS */}
        {showTouchControls && (
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 px-5 flex items-end justify-between pointer-events-none">
            {/* Left Steer Button */}
            <div className="pointer-events-auto">
              <button
                onPointerDown={e => {
                  e.preventDefault();
                  setTouch('left', true);
                }}
                onPointerUp={e => {
                  e.preventDefault();
                  setTouch('left', false);
                }}
                onPointerCancel={e => {
                  e.preventDefault();
                  setTouch('left', false);
                }}
                onPointerLeave={() => setTouch('left', false)}
                className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/15 active:bg-cyan-500/40 active:scale-90 border-2 border-white/25 active:border-cyan-400 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl transition-all duration-75 touch-none"
                aria-label="Steer Left"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
            </div>

            {/* Right Thumb Zone: Steer Right + Nitro Boost */}
            <div className="flex items-center gap-4 pointer-events-auto">
              {/* Boost Button */}
              <button
                onPointerDown={e => {
                  e.preventDefault();
                  setTouch('boost', true);
                }}
                onPointerUp={e => {
                  e.preventDefault();
                  setTouch('boost', false);
                }}
                onPointerCancel={e => {
                  e.preventDefault();
                  setTouch('boost', false);
                }}
                onPointerLeave={() => setTouch('boost', false)}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600/50 to-blue-500/50 active:from-cyan-400 active:to-blue-400 active:scale-90 border-2 border-cyan-400/60 backdrop-blur-xl flex flex-col items-center justify-center text-cyan-200 active:text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-75 touch-none"
                aria-label="Nitro Boost"
              >
                <Zap className="w-7 h-7 fill-current" />
                <span className="text-[9px] font-bold tracking-tight">BOOST</span>
              </button>

              {/* Right Steer Button */}
              <button
                onPointerDown={e => {
                  e.preventDefault();
                  setTouch('right', true);
                }}
                onPointerUp={e => {
                  e.preventDefault();
                  setTouch('right', false);
                }}
                onPointerCancel={e => {
                  e.preventDefault();
                  setTouch('right', false);
                }}
                onPointerLeave={() => setTouch('right', false)}
                className="w-20 h-20 rounded-full bg-white/10 hover:bg-white/15 active:bg-cyan-500/40 active:scale-90 border-2 border-white/25 active:border-cyan-400 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl transition-all duration-75 touch-none"
                aria-label="Steer Right"
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </div>
          </div>
        )}

        {/* START MENU OVERLAY */}
        {gameState === 'MENU' && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-md flex flex-col items-center justify-between p-6 text-center">
            {/* Top Brand & Badge */}
            <div className="pt-8 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide uppercase mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Mobile Arcade Dodger
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">
                MINI RACER
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xs">
                Weave through rush-hour traffic, grab coins, and blast nitro to smash records.
              </p>
            </div>

            {/* Car Preview Card */}
            <div className="w-full max-w-xs bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center shadow-xl">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                Selected Machine
              </div>
              <div className="relative w-28 h-40 flex items-center justify-center bg-slate-950/60 rounded-xl border border-slate-800/80 mb-3">
                {/* Visual Car rendering preview */}
                <div
                  className="w-12 h-24 rounded-lg relative shadow-md"
                  style={{ backgroundColor: selectedCar.color }}
                >
                  <div
                    className="absolute inset-x-2 top-0 bottom-0"
                    style={{ backgroundColor: selectedCar.secondaryColor }}
                  />
                  <div
                    className="absolute inset-x-1.5 top-4 h-10 rounded"
                    style={{ backgroundColor: selectedCar.roofColor }}
                  />
                  <div className="absolute inset-x-2 top-5 h-2 bg-white/40 rounded-sm" />
                </div>
              </div>
              <div className="text-base font-bold text-white">{selectedCar.name}</div>
              <div className="text-xs text-slate-400 mb-3">{selectedCar.tagline}</div>

              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => setShowGarage(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  Car Garage
                </button>
                <button
                  onClick={() => setShowTrackSelect(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Tracks ({Object.keys(THEMES).length})
                </button>
              </div>
            </div>

            {/* Play Button CTA */}
            <div className="w-full max-w-xs pb-6 flex flex-col gap-3">
              <button
                onClick={startGame}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-400 hover:brightness-110 active:scale-95 text-slate-950 text-lg font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-transform"
              >
                <Play className="w-6 h-6 fill-current" />
                TAP TO RACE
              </button>

              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Touch Left / Right / Boost
                </span>
                <span>•</span>
                <span>Keyboard: Arrows / Space</span>
              </div>
            </div>
          </div>
        )}

        {/* PAUSE MODAL OVERLAY */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
              <h2 className="text-2xl font-bold text-white mb-2">GAME PAUSED</h2>
              <p className="text-xs text-slate-400 mb-6">Take a breath, then get back onto the highway.</p>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={togglePause}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume Race
                </button>
                <button
                  onClick={startGame}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Run
                </button>
                <button
                  onClick={() => {
                    setGameState('MENU');
                    sound.stopEngine();
                  }}
                  className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-6 text-center animate-fade-in">
            <div className="pt-6">
              <div className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1">
                Wreck Detected
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">GAME OVER</h2>
            </div>

            {/* Score Summary Card */}
            <div className="w-full max-w-xs bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
              <div className="flex flex-col items-center pb-4 border-b border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Final Score
                </span>
                <span className="text-4xl font-black font-mono text-cyan-400 tabular-nums mt-1">
                  {stats.score}
                </span>
                {stats.score >= stats.highScore && stats.score > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full mt-1">
                    <Trophy className="w-3 h-3" /> NEW PERSONAL BEST!
                  </span>
                )}
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-4 text-left">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">Best Record</span>
                  <span className="text-base font-bold font-mono text-slate-200 tabular-nums">
                    {stats.highScore}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">Close Calls</span>
                  <span className="text-base font-bold font-mono text-sky-400 tabular-nums">
                    {stats.nearMisses}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">Distance</span>
                  <span className="text-base font-bold font-mono text-slate-200 tabular-nums">
                    {stats.distanceKm} km
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-400">Coins Added</span>
                  <span className="text-base font-bold font-mono text-amber-400 tabular-nums flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> +{stats.coinsCollected}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-xs pb-6 flex flex-col gap-2.5">
              <button
                onClick={startGame}
                className="w-full h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 text-base font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-transform"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                PLAY AGAIN
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGarage(true)}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  Garage
                </button>
                <button
                  onClick={() => {
                    setGameState('MENU');
                    sound.stopEngine();
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-800 transition-colors"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GARAGE MODAL / CAR SELECTION */}
        {showGarage && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col justify-between p-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">Vehicle Showroom</h3>
                <p className="text-xs text-slate-400">Unlock cars with higher high scores</p>
              </div>
              <button
                onClick={() => setShowGarage(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Done
              </button>
            </div>

            {/* Car Cards Carousel */}
            <div className="flex-1 py-4 flex flex-col justify-center items-center gap-4 overflow-y-auto">
              <div className="w-full max-w-sm flex flex-col gap-3">
                {CARS_DATA.map((car, idx) => {
                  const isUnlocked = car.unlockedByDefault || highScore >= car.unlockScore;
                  const isSelected = selectedCarIndex === idx;

                  return (
                    <div
                      key={car.id}
                      onClick={() => {
                        if (isUnlocked) {
                          setSelectedCarIndex(idx);
                          sound.playTap();
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : isUnlocked
                          ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer'
                          : 'bg-slate-950/60 border-slate-900 opacity-60'
                      }`}
                    >
                      {/* Car Visual Swatch */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-16 rounded-md relative flex-shrink-0 shadow"
                          style={{ backgroundColor: car.color }}
                        >
                          <div
                            className="absolute inset-x-1.5 top-0 bottom-0"
                            style={{ backgroundColor: car.secondaryColor }}
                          />
                          <div
                            className="absolute inset-x-1 top-2.5 h-6 rounded-sm"
                            style={{ backgroundColor: car.roofColor }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{car.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              {car.category}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-1">{car.tagline}</div>

                          {/* Mini Stat Bars */}
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <div>
                              SPD: <span className="text-white font-mono">{car.topSpeed}</span>
                            </div>
                            <div>
                              HND: <span className="text-white font-mono">{Math.round(car.handling * 100)}</span>
                            </div>
                            <div>
                              BST: <span className="text-cyan-400 font-mono">{car.boostMultiplier}x</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Select / Lock Status */}
                      <div>
                        {isSelected ? (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold">
                            Active
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedCarIndex(idx);
                              sound.playTap();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                          >
                            Select
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-amber-400/90 flex items-center gap-1">
                            🔒 {car.unlockScore} pts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="pt-2 text-center text-xs text-slate-500">
              High Score to beat: <span className="text-slate-300 font-bold">{highScore}</span>
            </div>
          </div>
        )}

        {/* TRACK / MAP SELECTOR MODAL */}
        {showTrackSelect && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col justify-between p-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">Select Racing Circuit</h3>
                <p className="text-xs text-slate-400">Choose from 7 atmospheric highway environments</p>
              </div>
              <button
                onClick={() => setShowTrackSelect(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Done
              </button>
            </div>

            {/* Maps List */}
            <div className="flex-1 py-4 flex flex-col gap-2.5 overflow-y-auto max-w-sm mx-auto w-full">
              {(Object.keys(THEMES) as MapThemeId[]).map(themeKey => {
                const themeData = THEMES[themeKey];
                const isCurrent = settings.theme === themeKey;

                return (
                  <div
                    key={themeKey}
                    onClick={() => {
                      setSettings(prev => ({ ...prev, theme: themeKey }));
                      if (onThemeChange) {
                        onThemeChange(themeKey);
                      }
                      sound.playTap();
                      setShowTrackSelect(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-xl border border-slate-800">
                        {themeData.icon || '🏁'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{themeData.name}</span>
                          {themeData.weather !== 'clear' && (
                            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded capitalize">
                              {themeData.weather}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{themeData.tagline}</div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold">
                          Active
                        </span>
                      ) : (
                        <button className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300">
                          Race
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center text-xs text-slate-500">
              Each circuit features custom road tarmac, weather particles, and roadside props
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
