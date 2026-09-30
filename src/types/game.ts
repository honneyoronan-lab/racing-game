export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface CarModel {
  id: string;
  name: string;
  category: string;
  color: string;
  secondaryColor: string;
  accentColor: string;
  roofColor: string;
  topSpeed: number; // e.g. 10 to 16
  acceleration: number; // 0.15 to 0.35
  handling: number; // 0.12 to 0.22 lane change speed
  boostMultiplier: number; // 1.5 to 2.2
  unlockScore: number;
  unlockedByDefault?: boolean;
  tagline: string;
}

export type TrafficCarType = 'compact' | 'sedan' | 'suv' | 'sport' | 'truck' | 'police' | 'taxi';

export interface TrafficCar {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  lane: number;
  targetLane: number;
  laneChangeTimer: number;
  speed: number;
  baseSpeed: number;
  color: string;
  secondaryColor: string;
  accentColor: string;
  type: TrafficCarType;
  passedPlayer: boolean;
  sirenTime: number;
  roofFeature?: string;
}

export type CollectibleType = 'COIN' | 'NITRO' | 'SHIELD' | 'INVINCIBILITY' | 'MULTIPLIER' | 'MAGNET';

export interface Collectible {
  id: number;
  x: number;
  y: number;
  lane: number;
  type: CollectibleType;
  collected: boolean;
  radius: number;
  pulsePhase: number;
}

export interface ActivePowerUps {
  invincibleTimer: number; // in frames (60 fps)
  invincibleTotal: number;
  multiplierTimer: number;
  multiplierTotal: number;
  multiplierFactor: number;
  magnetTimer: number;
  magnetTotal: number;
  shield: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'spark' | 'smoke' | 'flame' | 'debris' | 'star';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export type MapThemeId = 
  | 'neon_midnight'
  | 'sunset_highway'
  | 'desert_run'
  | 'alpine_glacier'
  | 'tokyo_rain'
  | 'synthwave_grid'
  | 'autumn_ridge';

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  controlScheme: 'touch_buttons' | 'drag_follow';
  theme: MapThemeId;
}

export interface GameSessionStats {
  score: number;
  highScore: number;
  coinsCollected: number;
  totalCoins: number;
  distanceKm: number;
  nearMisses: number;
  maxSpeedKmh: number;
  boostDurationSec: number;
}
