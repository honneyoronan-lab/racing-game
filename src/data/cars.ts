import { CarModel } from '../types/game';

export const CARS_DATA: CarModel[] = [
  {
    id: 'cyber-streak',
    name: 'Cyber Streak',
    category: 'Arcade Spec',
    color: '#00c8ff',
    secondaryColor: '#00558f',
    accentColor: '#ffffff',
    roofColor: '#0a192f',
    topSpeed: 11,
    acceleration: 0.18,
    handling: 0.16,
    boostMultiplier: 1.6,
    unlockScore: 0,
    unlockedByDefault: true,
    tagline: 'Balanced all-rounder with agile street steering'
  },
  {
    id: 'blaze-gt',
    name: 'Blaze GT',
    category: 'Muscle Sport',
    color: '#ff3344',
    secondaryColor: '#aa1122',
    accentColor: '#ffdd00',
    roofColor: '#1a0505',
    topSpeed: 12.5,
    acceleration: 0.22,
    handling: 0.14,
    boostMultiplier: 1.8,
    unlockScore: 500,
    tagline: 'High-torque powerhouse built for raw highway speed'
  },
  {
    id: 'toxic-viper',
    name: 'Neon Viper',
    category: 'Hyper Drift',
    color: '#00ff88',
    secondaryColor: '#008844',
    accentColor: '#e0ffe0',
    roofColor: '#041f10',
    topSpeed: 13.5,
    acceleration: 0.25,
    handling: 0.19,
    boostMultiplier: 1.9,
    unlockScore: 1200,
    tagline: 'Extreme agility for threading through razor-thin traffic gaps'
  },
  {
    id: 'shadow-apex',
    name: 'Phantom Apex',
    category: 'Prototype',
    color: '#eab308',
    secondaryColor: '#78350f',
    accentColor: '#fef08a',
    roofColor: '#18181b',
    topSpeed: 15,
    acceleration: 0.3,
    handling: 0.21,
    boostMultiplier: 2.1,
    unlockScore: 2500,
    tagline: 'Aerodynamic carbon stealth chassis with supercharged nitro'
  }
];

export interface MapThemeConfig {
  id: string;
  name: string;
  tagline: string;
  roadColor: string;
  grassColor: string;
  stripeColor: string;
  curbColorA: string;
  curbColorB: string;
  shoulderPattern: 'beacons' | 'pines' | 'palms' | 'cacti' | 'snowdrifts' | 'cyber_pillars';
  weather: 'clear' | 'snow' | 'rain' | 'sand' | 'leaves' | 'grid_stars';
  skyGradient: [string, string];
  icon: string;
}

export const THEMES: Record<string, MapThemeConfig> = {
  neon_midnight: {
    id: 'neon_midnight',
    name: 'Neon Midnight',
    tagline: 'Cyberpunk metro under high-voltage neon glow',
    roadColor: '#12131f',
    grassColor: '#070913',
    stripeColor: '#00f0ff',
    curbColorA: '#ff0055',
    curbColorB: '#0f172a',
    shoulderPattern: 'beacons',
    weather: 'clear',
    skyGradient: ['#020617', '#0f172a'],
    icon: '🌆'
  },
  sunset_highway: {
    id: 'sunset_highway',
    name: 'Sunset Coast',
    tagline: 'Golden hour coastal highway along rolling surf',
    roadColor: '#2d2833',
    grassColor: '#1a1824',
    stripeColor: '#fed7aa',
    curbColorA: '#f97316',
    curbColorB: '#ffffff',
    shoulderPattern: 'palms',
    weather: 'clear',
    skyGradient: ['#4c0519', '#1e1b4b'],
    icon: '🌅'
  },
  desert_run: {
    id: 'desert_run',
    name: 'Desert Canyon',
    tagline: 'Arid red sandstone cliffs and blowing dust',
    roadColor: '#382f25',
    grassColor: '#241b12',
    stripeColor: '#fde047',
    curbColorA: '#ea580c',
    curbColorB: '#78350f',
    shoulderPattern: 'cacti',
    weather: 'sand',
    skyGradient: ['#451a03', '#1c1917'],
    icon: '🏜️'
  },
  alpine_glacier: {
    id: 'alpine_glacier',
    name: 'Alpine Glacier',
    tagline: 'Frozen mountain pass with falling snow & black ice',
    roadColor: '#1e293b',
    grassColor: '#f1f5f9',
    stripeColor: '#38bdf8',
    curbColorA: '#0284c7',
    curbColorB: '#ffffff',
    shoulderPattern: 'snowdrifts',
    weather: 'snow',
    skyGradient: ['#082f49', '#0c4a6e'],
    icon: '❄️'
  },
  tokyo_rain: {
    id: 'tokyo_rain',
    name: 'Tokyo Rainstorm',
    tagline: 'Wet reflective asphalt beneath midnight downpour',
    roadColor: '#0b0f17',
    grassColor: '#030712',
    stripeColor: '#facc15',
    curbColorA: '#a855f7',
    curbColorB: '#0284c7',
    shoulderPattern: 'beacons',
    weather: 'rain',
    skyGradient: ['#030712', '#1e1b4b'],
    icon: '🌧️'
  },
  synthwave_grid: {
    id: 'synthwave_grid',
    name: 'Synthwave 80s',
    tagline: 'Outrun digital vector grid and neon wireframes',
    roadColor: '#170b28',
    grassColor: '#0b0416',
    stripeColor: '#ec4899',
    curbColorA: '#06b6d4',
    curbColorB: '#a855f7',
    shoulderPattern: 'cyber_pillars',
    weather: 'grid_stars',
    skyGradient: ['#3b0764', '#18022e'],
    icon: '⚡'
  },
  autumn_ridge: {
    id: 'autumn_ridge',
    name: 'Autumn Ridge',
    tagline: 'Twisting redwood pass with swirling golden maple leaves',
    roadColor: '#262422',
    grassColor: '#1c1611',
    stripeColor: '#fb923c',
    curbColorA: '#b45309',
    curbColorB: '#15803d',
    shoulderPattern: 'pines',
    weather: 'leaves',
    skyGradient: ['#2e1065', '#431407'],
    icon: '🍁'
  }
};
