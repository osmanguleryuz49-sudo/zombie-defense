import React, { useEffect, useRef, useState } from 'react';
import { GameState, Player, Zombie, Bullet, Turret, GameStats, ZombieType, Explosion, Drone, Mine } from '../types';
import { UpgradeMenu } from './UpgradeMenu';
import { Encyclopedia } from './Encyclopedia';
import { Pause, Play, ShoppingCart, Crosshair, MapPin, Terminal, ShieldAlert, Clock, Book, Info, Monitor, Hash, Home, LogOut, FastForward, ShieldCheck, MousePointer2, Bomb, Zap, Youtube, Bot, Gamepad2, Mouse, Wind } from 'lucide-react';

// Game World Constants
const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 1000;
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

const BASE_RADIUS = 60;
const PLAYER_RADIUS = 15;
const WAVE_DURATION = 60; // 60 Seconds

const INITIAL_PLAYER: Player = {
  id: 'player',
  pos: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 + 100 },
  radius: PLAYER_RADIUS,
  color: '#3b82f6', // Blue
  speed: 5,
  health: 100,
  maxHealth: 100,
  damage: 25,
  fireRate: 200, // ms
  lastFired: 0,
  regen: 0,
  dashCooldown: 0,
  maxDashCooldown: 100 // 1.5 seconds approx (60fps)
};

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  
  // Input Mode State
  const [inputMode, setInputMode] = useState<'PC' | 'MOBILE'>('PC');

  // Settings State
  const [settings] = useState({
    graphics: 'high', // 'high' | 'low'
    damageNumbers: true
  });
  
  // Game State Refs
  const playerRef = useRef<Player>({ ...INITIAL_PLAYER });
  const zombiesRef = useRef<Zombie[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const droneRef = useRef<Drone | null>(null);
  const minesRef = useRef<Mine[]>([]);
  
  // Mobile Control Refs
  const mobileInputRef = useRef({
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      isFiring: false,
      isDashPressed: false,
      isMinePressed: false
  });

  // Cheat Refs
  const godModeRef = useRef<boolean>(false);
  const baseGodModeRef = useRef<boolean>(false);
  const oneShotRef = useRef<boolean>(false);
  const fastFireRef = useRef<boolean>(false);

  // Camera State
  const cameraRef = useRef({ x: 0, y: 0 });
  
  // Input Refs
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef<{ screenX: number, screenY: number, worldX: number, worldY: number, down: boolean }>({ 
    screenX: 0, screenY: 0, worldX: 0, worldY: 0, down: false 
  });
  
  // Cheat Code State
  const keyHistory = useRef<string[]>([]);
  const [devMode, setDevMode] = useState(false);
  const [resourceInput, setResourceInput] = useState<string>("10000");
  // Force update for UI buttons when refs change
  const [, setTick] = useState(0); 

  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const waveTimerRef = useRef<number>(WAVE_DURATION);
  const lastRegenRef = useRef<number>(0);
  const lastBaseRegenRef = useRef<number>(0);
  const bossSpawnedRef = useRef<boolean>(false);
  
  // Stats
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    resources: 0,
    wave: 1,
    baseHealth: 1000,
    maxBaseHealth: 1000,
    nextWaveTime: WAVE_DURATION,
    unlockedEncyclopedia: [ZombieType.NORMAL],
    bossActive: false,
    mineCount: 0,
    maxMines: 3
  });

  const [waveAnnouncement, setWaveAnnouncement] = useState<{show: boolean, text: string, subtext?: string}>({show: false, text: ''});
  const [newEntryNotification, setNewEntryNotification] = useState<{show: boolean, text: string}>({show: false, text: ''});

  const [levels, setLevels] = useState({
    damage: 1,
    fireRate: 1,
    health: 1,
    baseHealth: 1,
    baseRegen: 0,
    baseSpikes: 0,
    turret: 0,
    turretDamage: 1,
    turretRange: 1,
    turretFireRate: 1,
    speed: 1,
    regen: 0,
    droneLevel: 0,
    mineCapacity: 0
  });

  // Wave Announcement Effect
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      if (stats.wave % 5 === 0) {
          setWaveAnnouncement({ show: true, text: "BOSS WAVE", subtext: "WARLORD APPROACHING" });
      } else {
          setWaveAnnouncement({ show: true, text: `WAVE ${stats.wave}` });
      }
      
      const timer = setTimeout(() => {
        setWaveAnnouncement(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [stats.wave, gameState]);

  // Calculate Costs
  const getCost = (type: string, currentLevel: number) => {
    const baseCosts: Record<string, number> = {
      damage: 50,
      fireRate: 80,
      health: 40,
      baseHealth: 60,
      baseRegen: 150,
      baseSpikes: 100,
      turret: 150,
      turretDamage: 100,
      turretRange: 80,
      turretFireRate: 120,
      speed: 100,
      regen: 120,
      droneLevel: 300,
      mineCapacity: 200
    };
    if (type === 'turret') return 150 + (currentLevel * 50);
    return Math.floor(baseCosts[type] * Math.pow(1.5, currentLevel));
  };

  const handleUpgrade = (type: string) => {
    const cost = getCost(type, levels[type as keyof typeof levels]);
    if (stats.resources >= cost) {
      
      setStats(prev => ({ ...prev, resources: prev.resources - cost }));
      
      // Handle special placement logic
      if (type === 'turret') {
        setLevels(prev => ({ ...prev, turret: prev.turret + 1 }));
        setGameState(GameState.PLACING_TURRET);
        return;
      }

      setLevels(prev => ({ ...prev, [type]: prev[type as keyof typeof levels] + 1 }));

      switch(type) {
        case 'damage':
          playerRef.current.damage += 10;
          break;
        case 'fireRate':
          playerRef.current.fireRate = Math.max(50, playerRef.current.fireRate * 0.9);
          break;
        case 'health':
          playerRef.current.maxHealth += 20;
          playerRef.current.health = playerRef.current.maxHealth;
          break;
        case 'baseHealth':
          setStats(prev => ({ ...prev, maxBaseHealth: prev.maxBaseHealth + 200, baseHealth: prev.maxBaseHealth + 200 }));
          break;
        case 'speed':
          playerRef.current.speed += 0.5;
          playerRef.current.maxDashCooldown = Math.max(40, playerRef.current.maxDashCooldown - 5);
          break;
        case 'regen':
          playerRef.current.regen += 1;
          break;
        case 'mineCapacity':
            setStats(prev => ({...prev, maxMines: prev.maxMines + 2, mineCount: prev.mineCount + 2}));
            break;
        case 'droneLevel':
            // Initialize or Upgrade Drone
            if (!droneRef.current) {
                droneRef.current = {
                    id: 'drone',
                    pos: { x: playerRef.current.pos.x, y: playerRef.current.pos.y },
                    radius: 8,
                    color: '#0ea5e9',
                    damage: 15,
                    fireRate: 500,
                    lastFired: 0,
                    orbitAngle: 0,
                    range: 250,
                    level: 1
                };
            } else {
                droneRef.current.level++;
                droneRef.current.damage += 10;
                droneRef.current.fireRate = Math.max(100, droneRef.current.fireRate * 0.9);
                droneRef.current.range += 50;
            }
            break;
        
        // Turret Global Upgrades - Apply to existing turrets instantly
        case 'turretDamage':
          turretsRef.current.forEach(t => t.damage = 15 + ((levels.turretDamage) * 5)); 
          break;
        case 'turretRange':
          turretsRef.current.forEach(t => t.range = 300 + ((levels.turretRange) * 25));
          break;
        case 'turretFireRate':
           turretsRef.current.forEach(t => t.fireRate = Math.max(50, 400 * Math.pow(0.9, levels.turretFireRate)));
           break;
      }
    }
  };

  const createTurretAtMouse = () => {
    // Calculate stats based on current global levels
    const damage = 15 + ((levels.turretDamage - 1) * 5);
    const range = 300 + ((levels.turretRange - 1) * 25);
    const fireRate = Math.max(50, 400 * Math.pow(0.9, levels.turretFireRate - 1));

    turretsRef.current.push({
      id: `turret-${Date.now()}-${Math.random()}`,
      pos: { x: mouseRef.current.worldX, y: mouseRef.current.worldY },
      radius: 12,
      color: '#10b981',
      range: range,
      damage: damage,
      fireRate: fireRate,
      lastFired: 0,
      level: 1
    });
  };

  const finalizeTurretPlacement = () => {
    if (gameState !== GameState.PLACING_TURRET) return;
    createTurretAtMouse();
    setGameState(GameState.PLAYING);
  };

  const skipWave = () => {
    waveTimerRef.current = 0;
  };

  const toggleGodMode = () => {
    godModeRef.current = !godModeRef.current;
    if (godModeRef.current) playerRef.current.health = playerRef.current.maxHealth;
    setTick(t => t + 1);
  };

  const toggleBaseGodMode = () => {
    baseGodModeRef.current = !baseGodModeRef.current;
    if (baseGodModeRef.current) setStats(prev => ({...prev, baseHealth: prev.maxBaseHealth}));
    setTick(t => t + 1);
  };

  const toggleOneShot = () => {
    oneShotRef.current = !oneShotRef.current;
    setTick(t => t + 1);
  }

  const toggleFastFire = () => {
    fastFireRef.current = !fastFireRef.current;
    if (fastFireRef.current) {
        playerRef.current.fireRate = 20; // Machine gun
    } else {
        // Reset to approximate upgraded level
        playerRef.current.fireRate = Math.max(50, 200 * Math.pow(0.9, levels.fireRate - 1));
    }
    setTick(t => t + 1);
  }

  const nukeZombies = () => {
    const count = zombiesRef.current.length;
    zombiesRef.current.forEach(z => {
        explosionsRef.current.push({
            id: `exp-${Date.now()}-${Math.random()}`,
            pos: z.pos,
            radius: 5,
            maxRadius: 60,
            alpha: 1,
            color: '#ef4444'
        });
    });
    setStats(prev => ({ 
        ...prev, 
        score: prev.score + (count * 50), 
        resources: prev.resources + (count * 50),
        bossActive: false // If boss was nuked
    }));
    zombiesRef.current = [];
  }

  const placeMine = () => {
     if (levels.mineCapacity > 0 && stats.mineCount > 0) {
        minesRef.current.push({
            id: `mine-${Date.now()}`,
            pos: { x: playerRef.current.pos.x, y: playerRef.current.pos.y },
            radius: 8,
            color: '#fbbf24',
            damage: 300 + (levels.mineCapacity * 50),
            triggerRadius: 40,
            active: true,
            placedAt: Date.now()
        });
        setStats(prev => ({...prev, mineCount: prev.mineCount - 1}));
    }
  };

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      keysRef.current[e.code] = true; 
      
      const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyB'];
      keyHistory.current = [...keyHistory.current, e.code].slice(-konamiCode.length);
      
      if (JSON.stringify(keyHistory.current) === JSON.stringify(konamiCode) || e.code === 'F1') {
        setDevMode(true);
      }

      if (e.code === 'Escape' && gameState === GameState.PLACING_TURRET) {
         setGameState(GameState.PLAYING);
      }

      // PAUSE TOGGLE
      if (e.code === 'KeyP' && (gameState === GameState.PLAYING || gameState === GameState.PAUSED)) {
          setGameState(prev => prev === GameState.PLAYING ? GameState.PAUSED : GameState.PLAYING);
      }

      // PLACE MINE
      if (e.code === 'KeyE' && gameState === GameState.PLAYING) {
          placeMine();
      }

      // DASH MECHANIC (PC)
      if (e.code === 'Space' && gameState === GameState.PLAYING && playerRef.current.dashCooldown <= 0 && inputMode === 'PC') {
         // Determine direction based on movement keys first, else mouse
         let dx = 0;
         let dy = 0;
         if (keysRef.current['KeyW']) dy -= 1;
         if (keysRef.current['KeyS']) dy += 1;
         if (keysRef.current['KeyA']) dx -= 1;
         if (keysRef.current['KeyD']) dx += 1;
         
         if (dx === 0 && dy === 0) {
             const angle = Math.atan2(mouseRef.current.worldY - playerRef.current.pos.y, mouseRef.current.worldX - playerRef.current.pos.x);
             dx = Math.cos(angle);
             dy = Math.sin(angle);
         } else {
             const len = Math.sqrt(dx*dx + dy*dy);
             dx /= len;
             dy /= len;
         }

         // Apply Dash Impulse
         playerRef.current.pos.x += dx * 100;
         playerRef.current.pos.y += dy * 100;
         playerRef.current.dashCooldown = playerRef.current.maxDashCooldown;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (inputMode === 'MOBILE') return; // Ignore mouse in mobile mode
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VIEWPORT_WIDTH / rect.width;
      const scaleY = VIEWPORT_HEIGHT / rect.height;
      
      mouseRef.current.screenX = (e.clientX - rect.left) * scaleX;
      mouseRef.current.screenY = (e.clientY - rect.top) * scaleY;
      
      mouseRef.current.worldX = mouseRef.current.screenX + cameraRef.current.x;
      mouseRef.current.worldY = mouseRef.current.screenY + cameraRef.current.y;
    };
    
    const handleMouseDown = () => { 
      if (inputMode === 'MOBILE') return;
      mouseRef.current.down = true; 
      
      if (gameState === GameState.PLACING_TURRET) {
        finalizeTurretPlacement();
      }
    };
    
    const handleMouseUp = () => { mouseRef.current.down = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameState, stats.mineCount, levels.mineCapacity, inputMode]);

  // Main Game Loop
  useEffect(() => {
    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    let isResumeFrame = true;

    const createExplosion = (pos: {x: number, y: number}, radius: number, color: string) => {
      explosionsRef.current.push({
        id: `exp-${Date.now()}-${Math.random()}`,
        pos: { ...pos },
        radius: 5,
        maxRadius: radius,
        alpha: 1,
        color: color
      });
    };

    const spawnZombie = (time: number) => {
      const isBossLevel = stats.wave % 5 === 0;
      
      // BOSS SPAWN LOGIC
      if (isBossLevel) {
          if (!bossSpawnedRef.current && !stats.bossActive) {
               // Spawn Boss
               const angle = Math.random() * Math.PI * 2;
               const dist = 1200; // Far away
               const x = WORLD_WIDTH/2 + Math.cos(angle) * dist;
               const y = WORLD_HEIGHT/2 + Math.sin(angle) * dist;
               
               const hp = 5000 + (stats.wave * 1000);

               zombiesRef.current.push({
                id: `boss-${stats.wave}`,
                pos: { x, y },
                type: ZombieType.BOSS_WARLORD,
                radius: 60,
                color: '#450a0a',
                speed: 1.5,
                baseSpeed: 1.5,
                health: hp,
                maxHealth: hp,
                damage: 150,
                value: 1000,
                isBoss: true
               });
               bossSpawnedRef.current = true;
               setStats(p => ({...p, bossActive: true}));
          }
          // Slow trickle of minions during boss fight
          if (time - spawnTimerRef.current < 2000) return;
      }

      // AGGRESSIVE SPAWN RATE SCALING
      const spawnRate = Math.max(50, 2000 - (stats.wave * 250)); 
      
      // Multi-spawn chance based on wave
      const spawnCount = Math.floor(1 + (stats.wave / 4));

      if (time - spawnTimerRef.current > spawnRate) {
        
        for(let i=0; i<spawnCount; i++) {
            // Random edge of WORLD
            let x, y;
            if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -100 : WORLD_WIDTH + 100;
            y = Math.random() * WORLD_HEIGHT;
            } else {
            x = Math.random() * WORLD_WIDTH;
            y = Math.random() < 0.5 ? -100 : WORLD_HEIGHT + 100;
            }

            const rand = Math.random();
            let type = ZombieType.NORMAL;
            let radius = 15;
            let color = '#22c55e'; // Green
            let speed = 2 + Math.random();
            let hp = 30;
            let dmg = 5;
            let val = 10;

            // Revised Spawn Logic to ensure all types appear earlier
            if (stats.wave >= 8 && rand > 0.96) {
                 type = ZombieType.INFECTOR; radius = 20; color = '#86198f'; speed = 2.5; hp = 150; dmg = 20; val = 60;
            } else if (stats.wave >= 7 && rand > 0.94) {
                 type = ZombieType.FROST; radius = 22; color = '#06b6d4'; speed = 1.8; hp = 300; dmg = 25; val = 70;
            } else if (stats.wave >= 6 && rand > 0.92) {
                 type = ZombieType.BERSERKER; radius = 19; color = '#991b1b'; speed = 2.5; hp = 200; dmg = 45; val = 55;
            } else if (stats.wave >= 5 && rand > 0.90) {
                type = ZombieType.GIANT; radius = 45; color = '#3f3f46'; speed = 0.8; hp = 1500; dmg = 80; val = 200;
            } else if (stats.wave >= 4 && rand > 0.85) {
                type = ZombieType.ASSASSIN; radius = 10; color = '#000000'; speed = 9.0; hp = 40; dmg = 40; val = 50;
            } else if (stats.wave >= 4 && rand > 0.80) {
                type = ZombieType.ARMORED; radius = 16; color = '#94a3b8'; speed = 2.0; hp = 250; dmg = 15; val = 40;
            } else if (stats.wave >= 3 && rand > 0.75) {
                type = ZombieType.SPITTER; radius = 18; color = '#84cc16'; speed = 3.0; hp = 60; dmg = 12; val = 25;
            } else if (stats.wave >= 3 && rand > 0.70) {
                type = ZombieType.GHOST; radius = 14; color = 'rgba(200, 200, 255, 0.3)'; speed = 4.5; hp = 35; dmg = 15; val = 25;
            } else if (stats.wave >= 2 && rand > 0.65) {
                type = ZombieType.TANK; radius = 28; color = '#581c87'; speed = 1.5; hp = 200; dmg = 25; val = 30;
            } else if (stats.wave >= 2 && rand > 0.60) {
                type = ZombieType.EXPLODER; radius = 18; color = '#f97316'; speed = 3.5; hp = 50; dmg = 10; val = 20;
            } else if (stats.wave >= 1 && rand > 0.50) {
                type = ZombieType.RUNNER; radius = 12; color = '#ef4444'; speed = 7; hp = 15; dmg = 8; val = 15;
            }

            // Difficulty Multiplier
            const difficultyMultiplier = 1 + (stats.wave * 0.3); // 30% stronger per wave

            // New Entry Logic
            if (!stats.unlockedEncyclopedia.includes(type)) {
                setStats(prev => ({
                    ...prev,
                    unlockedEncyclopedia: [...prev.unlockedEncyclopedia, type]
                }));
                setNewEntryNotification({ show: true, text: `NEW ENTRY: ${type.toUpperCase()}` });
                setTimeout(() => setNewEntryNotification({ show: false, text: '' }), 4000);
            }

            zombiesRef.current.push({
            id: `zombie-${time}-${i}`,
            pos: { x, y },
            type,
            radius,
            color,
            speed: speed * (1 + stats.wave * 0.05),
            baseSpeed: speed * (1 + stats.wave * 0.05),
            health: hp * difficultyMultiplier,
            maxHealth: hp * difficultyMultiplier,
            damage: dmg * difficultyMultiplier,
            value: Math.floor(val * difficultyMultiplier)
            });
        }
        spawnTimerRef.current = time;
      }
    };

    const loop = (time: number) => {
      const isMenu = gameState === GameState.MENU;
      const isPlaying = gameState === GameState.PLAYING || gameState === GameState.PLACING_TURRET;

      if (!ctx || gameState === GameState.PAUSED || gameState === GameState.MARKET || gameState === GameState.ENCYCLOPEDIA) {
        return;
      }

      if (isResumeFrame) {
         if (lastTimeRef.current > 0) {
             const pauseDuration = time - lastTimeRef.current;
             spawnTimerRef.current += pauseDuration;
             lastRegenRef.current += pauseDuration;
             lastBaseRegenRef.current += pauseDuration;
             playerRef.current.lastFired += pauseDuration;
             turretsRef.current.forEach(t => t.lastFired += pauseDuration);
             if (droneRef.current) droneRef.current.lastFired += pauseDuration;
         }
         lastTimeRef.current = time;
         isResumeFrame = false;
      }

      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (isPlaying) {
        
        // --- WAVE TIMER LOGIC ---
        waveTimerRef.current -= deltaTime / 1000;
        if (waveTimerRef.current <= 0) {
            // Wave ended
            
            // Check if boss was alive and remove it (time ran out, player survived)
            if (stats.bossActive) {
                // Remove boss logic
                zombiesRef.current = zombiesRef.current.filter(z => !z.isBoss);
            }

            setStats(prev => ({
                ...prev,
                wave: prev.wave + 1,
                nextWaveTime: WAVE_DURATION,
                resources: prev.resources + 200,
                bossActive: false,
                mineCount: Math.min(prev.maxMines, prev.mineCount + 1) // Replenish one mine per wave
            }));
            
            waveTimerRef.current = WAVE_DURATION;
            bossSpawnedRef.current = false; // Reset boss spawn flag for next cycle
        }
        
        if (Math.floor(waveTimerRef.current) !== Math.floor(stats.nextWaveTime)) {
            setStats(prev => ({...prev, nextWaveTime: waveTimerRef.current}));
        }

        // --- PLAYER REGEN & DASH CD ---
        if (playerRef.current.dashCooldown > 0) {
            playerRef.current.dashCooldown -= 1;
        }

        if (playerRef.current.regen > 0 && time - lastRegenRef.current > 1000) {
            if (!godModeRef.current) {
                playerRef.current.health = Math.min(playerRef.current.maxHealth, playerRef.current.health + playerRef.current.regen);
            }
            lastRegenRef.current = time;
        }

        // --- BASE REGEN ---
        if (levels.baseRegen > 0 && time - lastBaseRegenRef.current > 1000) {
            if (!baseGodModeRef.current) {
                setStats(prev => ({
                    ...prev, 
                    baseHealth: Math.min(prev.maxBaseHealth, prev.baseHealth + (levels.baseRegen * 5))
                }));
            }
            lastBaseRegenRef.current = time;
        }

        // --- DRONE LOGIC ---
        if (droneRef.current) {
            const drone = droneRef.current;
            drone.orbitAngle += 0.02;
            const targetX = playerRef.current.pos.x + Math.cos(drone.orbitAngle) * 60;
            const targetY = playerRef.current.pos.y + Math.sin(drone.orbitAngle) * 60;
            
            // Smooth float
            drone.pos.x += (targetX - drone.pos.x) * 0.1;
            drone.pos.y += (targetY - drone.pos.y) * 0.1;

            if (time - drone.lastFired > drone.fireRate) {
                // Find closest target
                let closestZombie: Zombie | null = null;
                let minDist = Infinity;
                zombiesRef.current.forEach(z => {
                    const dist = Math.hypot(z.pos.x - drone.pos.x, z.pos.y - drone.pos.y);
                    if (dist < drone.range && dist < minDist) {
                        minDist = dist;
                        closestZombie = z;
                    }
                });

                if (closestZombie) {
                     const z = closestZombie as Zombie;
                     const angle = Math.atan2(z.pos.y - drone.pos.y, z.pos.x - drone.pos.x);
                     bulletsRef.current.push({
                        id: `d-bullet-${Math.random()}`,
                        pos: { ...drone.pos },
                        radius: 2,
                        color: '#0ea5e9',
                        velocity: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
                        damage: drone.damage
                     });
                     drone.lastFired = time;
                }
            }
        }

        // --- MINE LOGIC ---
        // Check mines vs zombies
        for (let i = minesRef.current.length - 1; i >= 0; i--) {
            const mine = minesRef.current[i];
            let triggered = false;
            
            // Only active after 1 second
            if (Date.now() - mine.placedAt > 1000) {
                 for (let j = zombiesRef.current.length - 1; j >= 0; j--) {
                    const z = zombiesRef.current[j];
                    const dist = Math.hypot(mine.pos.x - z.pos.x, mine.pos.y - z.pos.y);
                    if (dist < mine.triggerRadius + z.radius) {
                        triggered = true;
                        break;
                    }
                 }
            }

            if (triggered) {
                createExplosion(mine.pos, 100, '#fbbf24');
                // Damage all nearby
                zombiesRef.current.forEach(z => {
                    const dist = Math.hypot(mine.pos.x - z.pos.x, mine.pos.y - z.pos.y);
                    if (dist < 100) {
                         z.health -= mine.damage;
                    }
                });
                minesRef.current.splice(i, 1);
            }
        }


        // --- MOVEMENT & ACTIONS ---
        const moveSpeed = playerRef.current.speed;
        let dx = 0;
        let dy = 0;

        // PC Controls
        if (inputMode === 'PC') {
            if (keysRef.current['KeyW']) dy -= 1;
            if (keysRef.current['KeyS']) dy += 1;
            if (keysRef.current['KeyA']) dx -= 1;
            if (keysRef.current['KeyD']) dx += 1;
        } 
        // Mobile Controls
        else if (inputMode === 'MOBILE') {
            dx = mobileInputRef.current.moveX;
            dy = mobileInputRef.current.moveY;

            // Handle Dash (Mobile)
            if (mobileInputRef.current.isDashPressed && playerRef.current.dashCooldown <= 0) {
                // Determine direction based on movement if moving, else face direction
                let dashDx = dx;
                let dashDy = dy;
                if (dashDx === 0 && dashDy === 0) {
                    dashDx = 1; // Default dash right if idle? Or forward?
                    dashDy = 0;
                }
                 // Normalize
                 const len = Math.sqrt(dashDx*dashDx + dashDy*dashDy);
                 if (len > 0) {
                     dashDx /= len;
                     dashDy /= len;
                 }

                playerRef.current.pos.x += dashDx * 100;
                playerRef.current.pos.y += dashDy * 100;
                playerRef.current.dashCooldown = playerRef.current.maxDashCooldown;
                mobileInputRef.current.isDashPressed = false; // Reset trigger
            }

             // Handle Mine (Mobile)
             if (mobileInputRef.current.isMinePressed) {
                placeMine();
                mobileInputRef.current.isMinePressed = false;
             }
        }
        
        if (dx !== 0 || dy !== 0) {
          const length = Math.sqrt(dx * dx + dy * dy);
          // Don't normalize if using joystick (magnitude matters for speed control usually, but here fixed speed)
          // For simple arcade feel, normalize vector to length 1 if it's PC or max joystick
          
          let nx = dx;
          let ny = dy;
          if (length > 1) { // Cap at 1
              nx = dx / length;
              ny = dy / length;
          } else if (inputMode === 'PC' && length > 0) {
               nx = dx / length;
               ny = dy / length;
          }

          playerRef.current.pos.x += nx * moveSpeed;
          playerRef.current.pos.y += ny * moveSpeed;
          playerRef.current.pos.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_WIDTH - PLAYER_RADIUS, playerRef.current.pos.x));
          playerRef.current.pos.y = Math.max(PLAYER_RADIUS, Math.min(WORLD_HEIGHT - PLAYER_RADIUS, playerRef.current.pos.y));
        }

        // SHOOTING LOGIC
        let shouldShoot = false;
        let shootAngle = 0;

        if (inputMode === 'PC' && mouseRef.current.down && gameState === GameState.PLAYING) {
             shouldShoot = true;
             shootAngle = Math.atan2(mouseRef.current.worldY - playerRef.current.pos.y, mouseRef.current.worldX - playerRef.current.pos.x);
        } else if (inputMode === 'MOBILE' && mobileInputRef.current.isFiring && gameState === GameState.PLAYING) {
             shouldShoot = true;
             shootAngle = Math.atan2(mobileInputRef.current.aimY, mobileInputRef.current.aimX);
        }

        if (shouldShoot && time - playerRef.current.lastFired > playerRef.current.fireRate) {
          bulletsRef.current.push({
            id: `bullet-${time}`,
            pos: { ...playerRef.current.pos },
            radius: 4,
            color: oneShotRef.current ? '#ef4444' : '#fbbf24', // Red bullets for insta-kill
            velocity: { x: Math.cos(shootAngle) * 12, y: Math.sin(shootAngle) * 12 },
            damage: oneShotRef.current ? 999999 : playerRef.current.damage
          });
          playerRef.current.lastFired = time;
        }

        // Turrets
        turretsRef.current.forEach(turret => {
          if (time - turret.lastFired > turret.fireRate) {
            let closestZombie: Zombie | null = null;
            let minDist = Infinity;
            zombiesRef.current.forEach(z => {
              const dist = Math.hypot(z.pos.x - turret.pos.x, z.pos.y - turret.pos.y);
              if (dist < turret.range && dist < minDist) {
                minDist = dist;
                closestZombie = z;
              }
            });
            if (closestZombie) {
              const z = closestZombie as Zombie;
              const angle = Math.atan2(z.pos.y - turret.pos.y, z.pos.x - turret.pos.x);
              bulletsRef.current.push({
                id: `t-bullet-${Math.random()}`,
                pos: { ...turret.pos },
                radius: 3,
                color: '#34d399',
                velocity: { x: Math.cos(angle) * 15, y: Math.sin(angle) * 15 },
                damage: turret.damage
              });
              turret.lastFired = time;
            }
          }
        });

        // Update Bullets
        bulletsRef.current.forEach(b => {
          b.pos.x += b.velocity.x;
          b.pos.y += b.velocity.y;
        });
        bulletsRef.current = bulletsRef.current.filter(b => 
          b.pos.x > 0 && b.pos.x < WORLD_WIDTH && b.pos.y > 0 && b.pos.y < WORLD_HEIGHT
        );

        if (gameState === GameState.PLAYING) spawnZombie(time);

        // Update Zombies
        zombiesRef.current.forEach(z => {
          const distToPlayer = Math.hypot(playerRef.current.pos.x - z.pos.x, playerRef.current.pos.y - z.pos.y);
          // Assassin targets player aggressively
          const target = (distToPlayer < 500 || z.type === ZombieType.ASSASSIN || z.type === ZombieType.BOSS_WARLORD) ? playerRef.current.pos : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
          
          let angle = Math.atan2(target.y - z.pos.y, target.x - z.pos.x);
          
          // Behavior Logic
          if (z.type === ZombieType.RUNNER) angle += Math.sin(time * 0.01) * 0.5;
          if (z.type === ZombieType.GHOST) angle += Math.cos(time * 0.005) * 0.3;
          
          // Berserker Speed Logic
          let currentSpeed = z.speed;
          if (z.type === ZombieType.BERSERKER) {
              const hpPct = z.health / z.maxHealth;
              currentSpeed = z.baseSpeed * (1 + (1 - hpPct)); // Up to 2x speed at 0 hp
              z.color = `rgb(${153 + (100 * (1-hpPct))}, 27, 27)`; // Gets brighter red
          }

          z.pos.x += Math.cos(angle) * currentSpeed;
          z.pos.y += Math.sin(angle) * currentSpeed;
        });

        // Collisions
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const b = bulletsRef.current[i];
          let hit = false;
          for (let j = zombiesRef.current.length - 1; j >= 0; j--) {
            const z = zombiesRef.current[j];
            const dist = Math.hypot(b.pos.x - z.pos.x, b.pos.y - z.pos.y);
            if (dist < z.radius + b.radius) {
              z.health -= b.damage;
              hit = true;
              
              if (z.type !== ZombieType.TANK && z.type !== ZombieType.GIANT && z.type !== ZombieType.ARMORED && z.type !== ZombieType.BOSS_WARLORD) {
                const kbAngle = Math.atan2(z.pos.y - b.pos.y, z.pos.x - b.pos.x);
                z.pos.x += Math.cos(kbAngle) * 5;
                z.pos.y += Math.sin(kbAngle) * 5;
              }

              if (z.health <= 0) {
                // Special Death Effects
                if (z.type === ZombieType.EXPLODER) {
                  createExplosion(z.pos, 100, '#f97316');
                  const distToPlayer = Math.hypot(z.pos.x - playerRef.current.pos.x, z.pos.y - playerRef.current.pos.y);
                  if (!godModeRef.current && distToPlayer < 100) playerRef.current.health -= 30;
                } else if (z.type === ZombieType.SPITTER) {
                   createExplosion(z.pos, 50, '#bef264'); // Acid pool
                } else if (z.type === ZombieType.INFECTOR) {
                    // Spawn Minions
                    for(let k=0; k<3; k++) {
                        zombiesRef.current.push({
                            id: `minion-${Date.now()}-${k}`,
                            pos: { x: z.pos.x + (Math.random()*20-10), y: z.pos.y + (Math.random()*20-10) },
                            type: ZombieType.RUNNER,
                            radius: 10,
                            color: '#ef4444',
                            speed: 8,
                            baseSpeed: 8,
                            health: 10,
                            maxHealth: 10,
                            damage: 5,
                            value: 5
                        });
                    }
                } else if (z.type === ZombieType.BOSS_WARLORD) {
                    setStats(p => ({...p, bossActive: false})); // End Boss Phase when dead
                    createExplosion(z.pos, 200, '#ef4444');
                    // Immediately skip to next wave when boss dies
                    waveTimerRef.current = 0;
                }

                zombiesRef.current.splice(j, 1);
                setStats(prev => ({ 
                    ...prev, 
                    score: prev.score + z.value, 
                    resources: prev.resources + z.value
                }));
              }
              break;
            }
          }
          if (hit) bulletsRef.current.splice(i, 1);
        }

        // Damage Player/Base
        zombiesRef.current.forEach(z => {
          const dist = Math.hypot(playerRef.current.pos.x - z.pos.x, playerRef.current.pos.y - z.pos.y);
          if (dist < playerRef.current.radius + z.radius) {
            const angle = Math.atan2(z.pos.y - playerRef.current.pos.y, z.pos.x - playerRef.current.pos.x);
            playerRef.current.pos.x -= Math.cos(angle) * 8;
            playerRef.current.pos.y -= Math.sin(angle) * 8;
            if (!godModeRef.current) playerRef.current.health -= z.damage * 0.1;

            // Frost Effect
            if (z.type === ZombieType.FROST) {
                // Temporary slow could be complex, simple implementation:
                // Just push them back harder
                playerRef.current.pos.x -= Math.cos(angle) * 20;
                playerRef.current.pos.y -= Math.sin(angle) * 20;
            }
          }

          const distToBase = Math.hypot(WORLD_WIDTH / 2 - z.pos.x, WORLD_HEIGHT / 2 - z.pos.y);
          if (distToBase < BASE_RADIUS + z.radius) {
            if (!baseGodModeRef.current) setStats(prev => ({ ...prev, baseHealth: prev.baseHealth - (z.damage * 0.1) }));
            const angle = Math.atan2(WORLD_HEIGHT/2 - z.pos.y, WORLD_WIDTH/2 - z.pos.x);
            z.pos.x -= Math.cos(angle) * 3;
            z.pos.y -= Math.sin(angle) * 3;

            // BASE SPIKES LOGIC
            if (levels.baseSpikes > 0) {
               z.health -= levels.baseSpikes * 0.5; // Damage per frame
               // Ensure we kill zombies if health drops
               if (z.health <= 0) {
                    zombiesRef.current = zombiesRef.current.filter(zm => zm.id !== z.id);
                    setStats(prev => ({ 
                        ...prev, 
                        score: prev.score + z.value, 
                        resources: prev.resources + z.value
                    }));
               }
            }
          }
        });
      }

      // Camera
      let targetCamX = playerRef.current.pos.x - VIEWPORT_WIDTH / 2;
      let targetCamY = playerRef.current.pos.y - VIEWPORT_HEIGHT / 2;
      targetCamX = Math.max(0, Math.min(targetCamX, WORLD_WIDTH - VIEWPORT_WIDTH));
      targetCamY = Math.max(0, Math.min(targetCamY, WORLD_HEIGHT - VIEWPORT_HEIGHT));
      
      if (isMenu) {
        cameraRef.current.x = WORLD_WIDTH/2 - VIEWPORT_WIDTH/2 + Math.sin(time * 0.0005) * 200;
        cameraRef.current.y = WORLD_HEIGHT/2 - VIEWPORT_HEIGHT/2 + Math.cos(time * 0.0003) * 100;
      } else {
        cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
        cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;
      }
      
      mouseRef.current.worldX = mouseRef.current.screenX + cameraRef.current.x;
      mouseRef.current.worldY = mouseRef.current.screenY + cameraRef.current.y;

      // Explosions
      for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
        const exp = explosionsRef.current[i];
        exp.radius += 2;
        exp.alpha -= 0.05;
        if (exp.alpha <= 0) explosionsRef.current.splice(i, 1);
      }

      if ((playerRef.current.health <= 0 || stats.baseHealth <= 0) && !isMenu) {
        setGameState(GameState.GAME_OVER);
      }

      // --- RENDER ---
      
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
      
      ctx.save();
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.lineWidth = 1;
      const startX = Math.floor(cameraRef.current.x / 100) * 100;
      const startY = Math.floor(cameraRef.current.y / 100) * 100;
      const endX = startX + VIEWPORT_WIDTH + 100;
      const endY = startY + VIEWPORT_HEIGHT + 100;
      for(let x=startX; x<endX; x+=100) { if(x>WORLD_WIDTH)break; ctx.beginPath();ctx.moveTo(x,Math.max(0,startY));ctx.lineTo(x,Math.min(WORLD_HEIGHT,endY));ctx.stroke(); }
      for(let y=startY; y<endY; y+=100) { if(y>WORLD_HEIGHT)break; ctx.beginPath();ctx.moveTo(Math.max(0,startX),y);ctx.lineTo(Math.min(WORLD_WIDTH,endX),y);ctx.stroke(); }

      // Base
      const centerX = WORLD_WIDTH / 2;
      const centerY = WORLD_HEIGHT / 2;
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.arc(centerX, centerY, BASE_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = levels.baseSpikes > 0 ? '#3b82f6' : '#94a3b8'; // Blue glow if spikes active
      ctx.lineWidth = 5; ctx.stroke();
      
      // Spikes Visual
      if (levels.baseSpikes > 0) {
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 + Math.sin(time * 0.01) * 0.5})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(centerX, centerY, BASE_RADIUS + 5, 0, Math.PI * 2); ctx.stroke();
      }

      const bhPct = Math.max(0, stats.baseHealth / stats.maxBaseHealth);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(centerX - 40, centerY + BASE_RADIUS + 15, 80, 8);
      ctx.fillStyle = baseGodModeRef.current ? '#fbbf24' : '#3b82f6'; ctx.fillRect(centerX - 40, centerY + BASE_RADIUS + 15, 80 * bhPct, 8); // Gold bar for god mode

      // Mines
      minesRef.current.forEach(m => {
          ctx.fillStyle = m.color;
          ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, m.radius, 0, Math.PI*2); ctx.fill();
          // Blink effect
          if (Math.floor(time / 500) % 2 === 0) {
              ctx.fillStyle = 'red';
              ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, 3, 0, Math.PI*2); ctx.fill();
          }
          // Range indicator
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(m.pos.x, m.pos.y, m.triggerRadius, 0, Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
      });

      // Turrets
      turretsRef.current.forEach(t => {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, t.range, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(t.pos.x, t.pos.y, t.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });

      // Zombies Rendering
      zombiesRef.current.forEach(z => {
        if (z.type === ZombieType.GHOST) ctx.globalAlpha = 0.3;
        
        ctx.fillStyle = z.color;
        ctx.beginPath();
        ctx.arc(z.pos.x, z.pos.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // SPECIAL RENDER STYLES
        if (z.type === ZombieType.TANK) {
          ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 3; ctx.stroke();
        } else if (z.type === ZombieType.GIANT) {
          ctx.strokeStyle = '#000000'; ctx.lineWidth = 4; ctx.stroke();
        } else if (z.type === ZombieType.EXPLODER) {
          ctx.strokeStyle = `rgba(249, 115, 22, ${0.5 + Math.sin(time * 0.02) * 0.5})`;
          ctx.lineWidth = 3; ctx.stroke();
        } else if (z.type === ZombieType.ARMORED) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.arc(z.pos.x, z.pos.y, z.radius - 4, 0, Math.PI * 2); ctx.stroke(); // Inner Ring
        } else if (z.type === ZombieType.SPITTER) {
          ctx.strokeStyle = '#bef264'; ctx.lineWidth = 2; ctx.stroke();
        } else if (z.type === ZombieType.ASSASSIN) {
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke();
        } else if (z.type === ZombieType.BOSS_WARLORD) {
           ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 6; ctx.stroke();
           ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; ctx.fill();
        } else if (z.type === ZombieType.FROST) {
            ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 10;
        } else if (z.type === ZombieType.INFECTOR) {
            ctx.strokeStyle = '#22c55e'; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
        }

        ctx.shadowBlur = 0;

        const zPct = z.health / z.maxHealth;
        // Larger health bar for boss
        const barWidth = z.type === ZombieType.BOSS_WARLORD ? 80 : 24;
        const barOffset = z.type === ZombieType.BOSS_WARLORD ? 40 : 12;
        
        ctx.fillStyle = 'red'; ctx.fillRect(z.pos.x - barOffset, z.pos.y - z.radius - 10, barWidth, 4);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(z.pos.x - barOffset, z.pos.y - z.radius - 10, barWidth * zPct, 4);
        
        ctx.globalAlpha = 1;
      });

      // Explosions
      explosionsRef.current.forEach(exp => {
        ctx.fillStyle = exp.color; ctx.globalAlpha = exp.alpha;
        ctx.beginPath(); ctx.arc(exp.pos.x, exp.pos.y, exp.radius, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Bullets
      bulletsRef.current.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fill();
      });

      // Player
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      const rotation = isMenu ? time * 0.001 : (inputMode === 'MOBILE' ? (Math.atan2(mobileInputRef.current.aimY, mobileInputRef.current.aimX)) : Math.atan2(mouseRef.current.worldY - p.pos.y, mouseRef.current.worldX - p.pos.x));
      ctx.rotate(rotation);
      ctx.fillStyle = godModeRef.current ? '#fbbf24' : p.color; ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, -5, 28, 10);
      ctx.restore();

      const phPct = Math.max(0, p.health / p.maxHealth);
      ctx.strokeStyle = `hsl(${120 * phPct}, 100%, 50%)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.pos.x, p.pos.y, p.radius + 8, 0, Math.PI * 2 * phPct); ctx.stroke();

      // Dash Bar
      if (p.dashCooldown > 0) {
          const dashPct = 1 - (p.dashCooldown / p.maxDashCooldown);
          ctx.fillStyle = 'white'; 
          ctx.fillRect(p.pos.x - 15, p.pos.y + 30, 30, 3);
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(p.pos.x - 15, p.pos.y + 30, 30 * dashPct, 3);
      }

      // Ghost Turret Placement Visual
      if (gameState === GameState.PLACING_TURRET) {
        const mx = mouseRef.current.worldX; const my = mouseRef.current.worldY;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; ctx.beginPath(); ctx.arc(mx, my, 300 + (levels.turretRange - 1)*25, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'; ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();

      // Drone Render (No rotation context)
      if (droneRef.current) {
          const d = droneRef.current;
          ctx.save();
          ctx.translate(d.pos.x - cameraRef.current.x, d.pos.y - cameraRef.current.y);
          ctx.fillStyle = d.color;
          ctx.beginPath(); ctx.arc(0, 0, d.radius, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#0ea5e9';
          ctx.beginPath(); ctx.arc(0, 0, d.radius + 4, 0, Math.PI*2); ctx.stroke();
          
          // Hover effect
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 10 + Math.sin(time * 0.01) * 5); ctx.stroke();
          ctx.restore();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, stats]); 

  // Handlers
  const startGame = (mode: 'PC' | 'MOBILE') => {
    setInputMode(mode);
    playerRef.current = { ...INITIAL_PLAYER };
    zombiesRef.current = [];
    bulletsRef.current = [];
    turretsRef.current = [];
    explosionsRef.current = [];
    droneRef.current = null;
    minesRef.current = [];
    lastTimeRef.current = 0;
    spawnTimerRef.current = 0;
    waveTimerRef.current = WAVE_DURATION;
    bossSpawnedRef.current = false;
    
    // Reset cheats
    godModeRef.current = false;
    baseGodModeRef.current = false;
    oneShotRef.current = false;
    fastFireRef.current = false;
    
    cameraRef.current = { x: WORLD_WIDTH/2 - VIEWPORT_WIDTH/2, y: WORLD_HEIGHT/2 - VIEWPORT_HEIGHT/2 };
    setStats({ 
      score: 0, resources: 200, wave: 1, baseHealth: 1000, maxBaseHealth: 1000, 
      nextWaveTime: WAVE_DURATION, unlockedEncyclopedia: [ZombieType.NORMAL],
      bossActive: false,
      mineCount: 0,
      maxMines: 3
    });
    setLevels({ damage: 1, fireRate: 1, health: 1, baseHealth: 1, baseRegen: 0, baseSpikes: 0, turret: 0, turretDamage: 1, turretRange: 1, turretFireRate: 1, speed: 1, regen: 0, droneLevel: 0, mineCapacity: 0 });
    setGameState(GameState.PLAYING);
  };

  const returnToMenu = () => {
      setGameState(GameState.MENU);
  };

  // Joystick Handlers
  const handleTouchStartLeft = (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const x = touch.clientX - rect.left - centerX;
      const y = touch.clientY - rect.top - centerY;
      
      const angle = Math.atan2(y, x);
      const dist = Math.min(Math.hypot(x, y), 50); // Max radius 50
      
      mobileInputRef.current.moveX = (Math.cos(angle) * dist) / 50;
      mobileInputRef.current.moveY = (Math.sin(angle) * dist) / 50;
  };

  const handleTouchMoveLeft = (e: React.TouchEvent) => {
      handleTouchStartLeft(e);
  };

  const handleTouchEndLeft = () => {
      mobileInputRef.current.moveX = 0;
      mobileInputRef.current.moveY = 0;
  };

  const handleTouchStartRight = (e: React.TouchEvent) => {
      mobileInputRef.current.isFiring = true;
      const touch = e.changedTouches[0];
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const x = touch.clientX - rect.left - centerX;
      const y = touch.clientY - rect.top - centerY;
      
      mobileInputRef.current.aimX = x;
      mobileInputRef.current.aimY = y;
  };

  const handleTouchMoveRight = (e: React.TouchEvent) => {
      handleTouchStartRight(e);
  };

  const handleTouchEndRight = () => {
      mobileInputRef.current.isFiring = false;
  };

  return (
    <div className="relative w-full h-screen bg-black flex justify-center items-center overflow-hidden">
      
      {/* Game Layer */}
      <canvas 
        ref={canvasRef} 
        width={VIEWPORT_WIDTH} 
        height={VIEWPORT_HEIGHT}
        className={`shadow-2xl border border-slate-700 bg-slate-900 transition-all duration-500 ${settings.graphics === 'high' ? 'shadow-[0_0_50px_rgba(0,0,0,0.8)]' : 'shadow-none'} ${inputMode === 'PC' ? 'cursor-crosshair' : 'cursor-none'}`}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', touchAction: 'none' }}
      />

      {/* MOBILE CONTROLS OVERLAY */}
      {inputMode === 'MOBILE' && gameState === GameState.PLAYING && (
        <div className="absolute inset-0 pointer-events-none select-none z-30" style={{ touchAction: 'none' }}>
            {/* Left Stick Zone */}
            <div 
                className="absolute bottom-10 left-10 w-48 h-48 bg-white/5 rounded-full border border-white/10 pointer-events-auto backdrop-blur-sm flex items-center justify-center active:bg-white/10 transition-colors"
                onTouchStart={handleTouchStartLeft}
                onTouchMove={handleTouchMoveLeft}
                onTouchEnd={handleTouchEndLeft}
            >
                <div className="w-16 h-16 bg-blue-500/50 rounded-full shadow-inner pointer-events-none"></div>
            </div>

            {/* Right Stick Zone (Aim & Shoot) */}
            <div 
                className="absolute bottom-10 right-10 w-48 h-48 bg-white/5 rounded-full border border-white/10 pointer-events-auto backdrop-blur-sm flex items-center justify-center active:bg-red-900/20 transition-colors"
                onTouchStart={handleTouchStartRight}
                onTouchMove={handleTouchMoveRight}
                onTouchEnd={handleTouchEndRight}
            >
                 <div className="w-16 h-16 bg-red-500/50 rounded-full shadow-inner pointer-events-none flex items-center justify-center">
                    <Crosshair className="text-white opacity-50" size={24} />
                 </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-60 right-8 flex flex-col gap-4 pointer-events-auto">
                 <button 
                    className={`w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center shadow-lg active:scale-95 transition-all ${playerRef.current.dashCooldown > 0 ? 'bg-slate-700 opacity-50' : 'bg-blue-600'}`}
                    onTouchStart={() => mobileInputRef.current.isDashPressed = true}
                 >
                    <Wind className="text-white" />
                 </button>
                 <button 
                    className={`w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center shadow-lg active:scale-95 transition-all ${stats.mineCount > 0 ? 'bg-yellow-600' : 'bg-slate-700 opacity-50'}`}
                    onTouchStart={() => mobileInputRef.current.isMinePressed = true}
                 >
                    <Bomb className="text-white" />
                 </button>
            </div>
        </div>
      )}

      {/* Wave Announcement Overlay */}
      {waveAnnouncement.show && (
        <div className="absolute top-1/4 left-0 right-0 text-center pointer-events-none z-40 animate-bounce">
          <h2 className="text-8xl font-black text-red-600 tracking-widest drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
            {waveAnnouncement.text}
          </h2>
          {waveAnnouncement.subtext && (
               <p className="text-4xl text-white font-bold mt-4 tracking-widest bg-black/50 inline-block px-4 py-1">{waveAnnouncement.subtext}</p>
          )}
        </div>
      )}

      {/* Encyclopedia Entry Notification */}
      {newEntryNotification.show && (
        <div className="absolute bottom-20 right-4 z-40 animate-in slide-in-from-right fade-in duration-500">
           <div className="bg-blue-900/90 border border-blue-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4">
              <div className="bg-blue-600 p-2 rounded-full animate-pulse">
                <Book size={24} />
              </div>
              <div>
                <h4 className="font-bold text-blue-200 text-xs tracking-wider">DATABASE UPDATED</h4>
                <p className="font-bold text-lg">{newEntryNotification.text}</p>
              </div>
           </div>
        </div>
      )}

      {/* Placement Hint */}
      {gameState === GameState.PLACING_TURRET && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-pulse pointer-events-none">
          CLICK TO PLACE TURRET (CANCEL: ESC)
        </div>
      )}

      {/* DEV MODE CONSOLE */}
      {devMode && (gameState === GameState.PLAYING || gameState === GameState.PLACING_TURRET) && (
        <div className="absolute top-24 left-4 bg-red-900/90 border-2 border-red-500 p-4 rounded-lg z-50 text-white backdrop-blur-sm shadow-[0_0_20px_rgba(220,38,38,0.5)] max-w-xs animate-in slide-in-from-left max-h-[80vh] overflow-y-auto">
            <h3 className="font-black text-red-200 mb-3 flex items-center gap-2 border-b border-red-500/50 pb-2 text-sm tracking-widest">
                <Terminal size={16} /> CHEAT PANEL
            </h3>
            <div className="flex flex-col gap-2">
                <button
                    onClick={skipWave}
                    className="bg-red-950 hover:bg-red-800 border border-red-700 hover:border-red-500 px-3 py-2 rounded text-xs font-mono text-left flex items-center gap-2 transition-colors"
                >
                    <FastForward size={14} className="text-red-400" />
                    &gt;&gt; SKIP WAVE
                </button>
                
                <button
                    onClick={nukeZombies}
                    className="bg-red-950 hover:bg-red-800 border border-red-700 hover:border-red-500 px-3 py-2 rounded text-xs font-mono text-left flex items-center gap-2 transition-colors"
                >
                    <Bomb size={14} className="text-orange-400" />
                    &gt;&gt; NUKE ALL (KILL ALL)
                </button>

                {/* Custom Resource Input */}
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={resourceInput}
                    onChange={(e) => setResourceInput(e.target.value)}
                    className="w-full bg-black border border-red-700 rounded text-xs px-2 py-1 text-yellow-400 font-mono focus:outline-none focus:border-red-500"
                    placeholder="Amt"
                  />
                  <button
                    onClick={() => setStats(p => ({...p, resources: p.resources + parseInt(resourceInput || '0')}))}
                    className="bg-red-950 hover:bg-red-800 border border-red-700 hover:border-red-500 px-3 py-1 rounded text-xs font-bold transition-colors"
                  >
                    ADD
                  </button>
                </div>

                <button
                    onClick={toggleGodMode}
                    className={`border px-3 py-2 rounded text-xs font-mono text-left flex items-center gap-2 transition-colors ${godModeRef.current ? 'bg-yellow-600/50 border-yellow-400 text-white' : 'bg-red-950 hover:bg-red-800 border-red-700 text-white'}`}
                >
                    <ShieldCheck size={14} className={godModeRef.current ? "text-white" : "text-green-400"} />
                    {godModeRef.current ? `>> GOD MODE: ON` : `>> GOD MODE (PLAYER)`}
                </button>

                <button
                    onClick={toggleBaseGodMode}
                    className={`border px-3 py-2 rounded text-xs font-mono text-left flex items-center gap-2 transition-colors ${baseGodModeRef.current ? 'bg-blue-600/50 border-blue-400 text-white' : 'bg-red-950 hover:bg-red-800 border-red-700 text-white'}`}
                >
                    <Home size={14} className={baseGodModeRef.current ? "text-white" : "text-blue-400"} />
                    {baseGodModeRef.current ? `>> BASE SHIELD: ON` : `>> BASE SHIELD`}
                </button>

                <button
                    onClick={toggleOneShot}
                    className={`border px-3 py-2 rounded text-xs font-mono text-left flex items-center gap-2 transition-colors ${oneShotRef.current ? 'bg-purple-600/50 border-purple-400 text-white' : 'bg-red-950 hover:bg-red-800 border-red-700 text-white'}`}
                >
                    <Crosshair size={14} className={oneShotRef.current ? "text-white" : "text-purple-400"} />
                    {oneShotRef.current ? `>> INSTA-KILL: ON` : `>> INSTA-KILL`}
                </button>

                 <button
                    onClick={toggleFastFire}
                    className={`border px-3 py-2 rounded text-xs font-mono text-left flex items-center gap-2 transition-colors ${fastFireRef.current ? 'bg-orange-600/50 border-orange-400 text-white' : 'bg-red-950 hover:bg-red-800 border-red-700 text-white'}`}
                >
                    <Zap size={14} className={fastFireRef.current ? "text-white" : "text-orange-400"} />
                    {fastFireRef.current ? `>> MINIGUN MODE: ON` : `>> MINIGUN MODE`}
                </button>

                 <button
                    onClick={() => setDevMode(false)}
                    className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] py-1 rounded text-center"
                >
                    HIDE PANEL
                </button>
            </div>
        </div>
      )}

      {/* HUD Layer */}
      {(gameState === GameState.PLAYING || gameState === GameState.PLACING_TURRET) && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          <div className="flex gap-4">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 text-white backdrop-blur flex items-center gap-3">
              <div className="text-center">
                 <div className="text-xs text-slate-400 uppercase">Next Wave</div>
                 <div className={`text-2xl font-bold font-mono ${stats.nextWaveTime < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                    {stats.bossActive ? `${Math.ceil(stats.nextWaveTime)}s` : `${Math.ceil(stats.nextWaveTime)}s`}
                 </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-700"></div>
              <div>
                <div className="text-xs text-slate-400 uppercase">Wave</div>
                <div className="text-2xl font-bold text-red-500">{stats.wave}</div>
              </div>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 text-white backdrop-blur">
              <div className="text-xs text-slate-400 uppercase">Score</div>
              <div className="text-2xl font-bold">{stats.score}</div>
            </div>
            
            {/* Tech HUD */}
            {levels.mineCapacity > 0 && (
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 text-white backdrop-blur flex flex-col items-center justify-center pointer-events-auto cursor-pointer" onClick={placeMine}>
                    <div className="text-xs text-slate-400 uppercase flex items-center gap-1"><Bomb size={12}/> Mines {inputMode === 'PC' && '[E]'}</div>
                    <div className={`text-2xl font-bold ${stats.mineCount > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>{stats.mineCount}/{stats.maxMines}</div>
                </div>
            )}
             {droneRef.current && (
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 text-white backdrop-blur flex flex-col items-center justify-center">
                    <div className="text-xs text-slate-400 uppercase flex items-center gap-1"><Bot size={12}/> Drone</div>
                    <div className="text-sm font-bold text-blue-400">LVL {droneRef.current.level}</div>
                </div>
            )}

          </div>

          <div className="flex gap-2 pointer-events-auto mr-32">
             <button 
              onClick={() => setGameState(GameState.ENCYCLOPEDIA)}
              className="p-3 bg-blue-700 hover:bg-blue-600 text-white rounded-full shadow-lg transition flex items-center gap-2 font-bold px-4 border border-blue-500"
              title="Intel"
            >
              <Book size={20} /> <span className="hidden md:inline">INTEL</span>
            </button>
             <button 
              onClick={() => setGameState(GameState.MARKET)}
              className="p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full shadow-lg transition flex items-center gap-2 font-bold px-6"
            >
              <ShoppingCart size={20} /> MARKET
            </button>
            <button 
              onClick={() => setGameState(GameState.PAUSED)}
              className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition border border-slate-500 flex items-center justify-center gap-2 px-6"
              title="Pause [P]"
            >
              <Pause size={20} /> PAUSE
            </button>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 text-white backdrop-blur min-w-[120px] text-right">
            <div className="text-xs text-slate-400 uppercase">Resources</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.resources}</div>
          </div>
        </div>
      )}

      {/* Cinematic Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-t from-black via-slate-900/90 to-black backdrop-blur-sm">
          
          <div className="relative text-center mb-12 group cursor-default">
            <div className="absolute -inset-1 bg-red-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition duration-1000 animate-pulse"></div>
            <h1 className="relative text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 drop-shadow-2xl tracking-tighter">
              ZOMBIE DEFENSE
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-red-600 tracking-[0.5em] mt-2 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
              WIDE WORLD
            </h2>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-md px-8 relative z-10">
            {/* PC START */}
            <button 
              onClick={() => startGame('PC')}
              className="group relative px-6 py-3 bg-slate-900 hover:bg-blue-900 border border-slate-700 hover:border-blue-500 rounded-sm overflow-hidden transition-all duration-300 w-full"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              <div className="flex items-center justify-center gap-3 text-white font-bold text-lg tracking-widest group-hover:scale-105 transition-transform">
                <Mouse size={20} className="text-blue-500 group-hover:text-white" />
                START OPERATION (PC)
              </div>
            </button>

            {/* MOBILE START */}
            <button 
              onClick={() => startGame('MOBILE')}
              className="group relative px-6 py-3 bg-slate-900 hover:bg-green-900 border border-slate-700 hover:border-green-500 rounded-sm overflow-hidden transition-all duration-300 w-full"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-green-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
              <div className="flex items-center justify-center gap-3 text-white font-bold text-lg tracking-widest group-hover:scale-105 transition-transform">
                <Gamepad2 size={20} className="text-green-500 group-hover:text-white" />
                START OPERATION (MOBILE)
              </div>
            </button>
            
            {/* Social Links */}
            <div className="grid grid-cols-2 gap-4 mt-2">
                <a 
                  href="https://x.com/guleryuz_o32523" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-black/50 border border-slate-700 hover:border-white hover:bg-black text-slate-400 hover:text-white transition-all rounded group"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current transition-transform group-hover:scale-110">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="font-bold font-mono text-sm">TWITTER</span>
                </a>
                <a 
                  href="https://www.youtube.com/@aliosman49503" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-black/50 border border-slate-700 hover:border-red-600 hover:bg-black text-slate-400 hover:text-red-500 transition-all rounded group"
                >
                  <Youtube className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="font-bold font-mono text-sm">YOUTUBE</span>
                </a>
            </div>

            <div className="text-center mt-8 text-slate-600 text-xs font-mono">
              <p>v4.1.0 - MOBILE PROTOCOL ENABLED</p>
            </div>
          </div>
          
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black to-transparent opacity-80 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent opacity-80 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-50">
          <h1 className="text-8xl font-bold mb-4 text-red-500 drop-shadow-lg animate-pulse">MISSION FAILED</h1>
          <div className="bg-black/50 p-8 rounded-xl border border-red-900 mb-8 text-center min-w-[400px]">
             <div className="grid grid-cols-2 gap-8 text-xl">
                <div className="text-slate-400">Wave Reached</div>
                <div className="font-mono text-yellow-400 font-bold text-2xl">{stats.wave}</div>
                <div className="text-slate-400">Total Score</div>
                <div className="font-mono text-green-400 font-bold text-2xl">{stats.score}</div>
             </div>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={returnToMenu}
               className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-sm text-xl font-bold tracking-wider transition flex items-center gap-3"
             >
               <Home size={24} />
               MAIN MENU
             </button>
             <button 
               onClick={() => startGame(inputMode)}
               className="px-8 py-4 bg-white text-black hover:bg-slate-200 rounded-sm text-xl font-bold tracking-wider transition hover:scale-105 flex items-center gap-3"
             >
               <Play size={24} />
               RESTART
             </button>
          </div>
        </div>
      )}

      {/* Encyclopedia Modal */}
      {gameState === GameState.ENCYCLOPEDIA && (
        <Encyclopedia 
          unlockedTypes={stats.unlockedEncyclopedia}
          onClose={() => setGameState(GameState.PLAYING)}
        />
      )}

      {/* Simple Pause Menu */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
           <div className="bg-slate-900 border-2 border-slate-600 rounded-xl p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px]">
              <div className="flex items-center gap-3 mb-2 text-yellow-500">
                 <Pause size={48} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-4">GAME PAUSED</h2>
              
              <button 
                onClick={() => setGameState(GameState.PLAYING)}
                className="w-full px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded font-bold transition flex items-center justify-center gap-3 text-xl tracking-wider shadow-lg"
              >
                <Play size={24} fill="currentColor" /> CONTINUE
              </button>

              <button 
                onClick={returnToMenu}
                className="w-full px-8 py-4 bg-red-900/50 hover:bg-red-900 text-red-200 hover:text-white border border-red-800/50 rounded font-bold transition flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
              >
                <LogOut size={20} /> MAIN MENU
              </button>
           </div>
        </div>
      )}

      {/* Market Menu */}
      {gameState === GameState.MARKET && (
        <UpgradeMenu 
          resources={stats.resources} 
          stats={stats}
          onUpgrade={handleUpgrade}
          onClose={() => setGameState(GameState.PLAYING)}
          costs={{
            damage: getCost('damage', levels.damage),
            fireRate: getCost('fireRate', levels.fireRate),
            health: getCost('health', levels.health),
            baseHealth: getCost('baseHealth', levels.baseHealth),
            turret: getCost('turret', levels.turret),
            turretDamage: getCost('turretDamage', levels.turretDamage),
            turretRange: getCost('turretRange', levels.turretRange),
            turretFireRate: getCost('turretFireRate', levels.turretFireRate),
            speed: getCost('speed', levels.speed),
            regen: getCost('regen', levels.regen),
            baseRegen: getCost('baseRegen', levels.baseRegen),
            baseSpikes: getCost('baseSpikes', levels.baseSpikes),
            droneLevel: getCost('droneLevel', levels.droneLevel),
            mineCapacity: getCost('mineCapacity', levels.mineCapacity)
          }}
          levels={levels}
        />
      )}
    </div>
  );
};