export enum GameState {
  MENU,
  PLAYING,
  PAUSED,
  GAME_OVER,
  PLACING_TURRET,
  ENCYCLOPEDIA,
  MARKET // New state specifically for the shop
}

export enum ZombieType {
  NORMAL = 'normal',
  RUNNER = 'runner',
  TANK = 'tank',
  EXPLODER = 'exploder',
  GHOST = 'ghost',
  GIANT = 'giant',
  ARMORED = 'armored',
  SPITTER = 'spitter',
  ASSASSIN = 'assassin',
  // New Types
  INFECTOR = 'infector', // Spawns minions on death
  FROST = 'frost', // Slows player
  BERSERKER = 'berserker', // Gets faster at low health
  BOSS_WARLORD = 'boss_warlord' // Boss Unit
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Position;
  radius: number;
  color: string;
}

export interface Player extends Entity {
  speed: number;
  health: number;
  maxHealth: number;
  damage: number;
  fireRate: number; // ms between shots
  lastFired: number;
  regen: number; // Health regenerated per second
  // New Mechanics
  dashCooldown: number;
  maxDashCooldown: number;
}

export interface Drone extends Entity {
  damage: number;
  fireRate: number;
  lastFired: number;
  orbitAngle: number;
  range: number;
  level: number;
}

export interface Mine extends Entity {
  damage: number;
  triggerRadius: number;
  active: boolean;
  placedAt: number;
}

export interface Zombie extends Entity {
  type: ZombieType;
  speed: number;
  baseSpeed: number; // To calculate berserk speed
  health: number;
  maxHealth: number;
  damage: number;
  value: number; // Resources given on death
  // Effect flags
  isBoss?: boolean;
}

export interface Bullet extends Entity {
  velocity: Position;
  damage: number;
}

export interface Turret extends Entity {
  range: number;
  damage: number;
  fireRate: number;
  lastFired: number;
  level: number;
}

export interface Explosion {
  id: string;
  pos: Position;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface GameStats {
  score: number;
  resources: number;
  wave: number;
  baseHealth: number;
  maxBaseHealth: number;
  nextWaveTime: number; // Seconds until next wave
  unlockedEncyclopedia: ZombieType[]; // List of encountered zombies
  bossActive: boolean;
  mineCount: number; // Available mines
  maxMines: number;
}

export interface UpgradeCost {
  base: number;
  scale: number;
}