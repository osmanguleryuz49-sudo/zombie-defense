import React, { useState } from 'react';
import { Shield, Crosshair, Home, Zap, Heart, MapPin, Activity, Wind, Play, Rocket, MousePointer2, User, Layers, Wrench, Bot, Bomb } from 'lucide-react';
import { GameStats } from '../types';

interface UpgradeMenuProps {
  resources: number;
  stats: GameStats;
  onUpgrade: (type: string) => void;
  onClose: () => void;
  costs: Record<string, number>;
  levels: Record<string, number>;
}

const TEXTS = {
  title: "Logistics & Upgrades",
  subtitle: "Weapons & Equipment Store",
  currentRes: "Current Resources",
  close: "Exit Market",
  build: "Build",
  upgrade: "Upgrade",
  level: "Level",
  count: "Count",
  tabs: {
    player: "PLAYER",
    base: "BASE",
    defense: "DEFENSE",
    tech: "TECH"
  }
};

export const UpgradeMenu: React.FC<UpgradeMenuProps> = ({
  resources,
  onUpgrade,
  onClose,
  costs,
  levels
}) => {
  const [activeTab, setActiveTab] = useState<'player' | 'base' | 'defense' | 'tech'>('player');

  // Upgrades Data Structure
  const upgrades = {
    player: [
      { 
        id: 'damage', 
        name: 'Weapon Damage', 
        icon: Crosshair, 
        desc: 'Bullets deal more damage.'
      },
      { 
        id: 'fireRate', 
        name: 'Fire Rate', 
        icon: Zap, 
        desc: 'Shoot faster.'
      },
      { 
        id: 'speed', 
        name: 'Agility Training', 
        icon: Wind, 
        desc: 'Move faster and dash more often.'
      },
      { 
        id: 'health', 
        name: 'Armor Plating', 
        icon: Shield, 
        desc: 'Increases max health.'
      },
      { 
        id: 'regen', 
        name: 'Nanotech Regen', 
        icon: Activity, 
        desc: 'Regenerates health over time.'
      },
    ],
    base: [
      { 
        id: 'baseHealth', 
        name: 'Base Fortification', 
        icon: Home, 
        desc: 'Increases base health capacity.'
      },
      { 
        id: 'baseRegen', 
        name: 'Auto-Repair System', 
        icon: Wrench, 
        desc: 'Automatically repairs the base over time.'
      },
      { 
        id: 'baseSpikes', 
        name: 'Electro-Static Hull', 
        icon: Zap, 
        desc: 'Zombies take damage when touching the base.'
      },
    ],
    defense: [
      { 
        id: 'turret', 
        name: 'Construct Turret', 
        icon: MapPin, 
        desc: 'Place a new automated turret.',
        isPlacement: true
      },
      { 
        id: 'turretDamage', 
        name: 'Turret Damage', 
        icon: Rocket, 
        desc: 'All turrets deal more damage.'
      },
      { 
        id: 'turretRange', 
        name: 'Turret Range', 
        icon: Crosshair, 
        desc: 'Increases targeting range of all turrets.'
      },
      { 
        id: 'turretFireRate', 
        name: 'Turret Speed', 
        icon: Zap, 
        desc: 'Turrets shoot faster.'
      },
    ],
    tech: [
      {
        id: 'droneLevel',
        name: 'Battle Drone',
        icon: Bot,
        desc: 'Unlocks/Upgrades a companion drone that shoots enemies.'
      },
      {
        id: 'mineCapacity',
        name: 'Proximity Mines',
        icon: Bomb,
        desc: 'Increases max mine capacity and damage. (Press E)'
      }
    ]
  };

  const renderGrid = (items: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((u) => {
        const cost = costs[u.id];
        const levelLabel = u.id === 'turret' 
          ? `${TEXTS.count}: ${levels.turret}` 
          : `${TEXTS.level} ${levels[u.id]}`;
        
        const canAfford = resources >= cost;

        return (
          <div key={u.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-blue-500 transition relative group flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-slate-700 rounded-lg text-blue-400">
                <u.icon size={20} />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{levelLabel}</span>
              </div>
            </div>
            
            <h3 className="text-md font-bold text-white mb-1">{u.name}</h3>
            <p className="text-slate-400 text-xs mb-4 flex-1">{u.desc}</p>
            
            <button
              onClick={() => onUpgrade(u.id)}
              disabled={!canAfford}
              className={`w-full py-2 px-3 rounded font-bold flex justify-between items-center text-sm transition ${
                canAfford 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <span>{u.isPlacement ? TEXTS.build : TEXTS.upgrade}</span>
              <span className="flex items-center gap-1 font-mono">
                {cost} <span className="text-yellow-400 text-[10px]">M</span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-xl w-full max-w-5xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <div>
            <h2 className="text-3xl font-black text-white tracking-wider uppercase flex items-center gap-2">
              <ShoppingCartIcon /> {TEXTS.title}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{TEXTS.subtitle}</p>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-600/50 px-4 py-2 rounded flex flex-col items-end">
             <span className="text-xs text-yellow-500 uppercase font-bold">{TEXTS.currentRes}</span>
             <span className="text-yellow-400 font-mono text-2xl font-bold">{resources}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-slate-700 overflow-x-auto">
          <TabButton 
            active={activeTab === 'player'} 
            onClick={() => setActiveTab('player')} 
            icon={User} 
            label={TEXTS.tabs.player} 
          />
          <TabButton 
            active={activeTab === 'base'} 
            onClick={() => setActiveTab('base')} 
            icon={Home} 
            label={TEXTS.tabs.base} 
          />
          <TabButton 
            active={activeTab === 'defense'} 
            onClick={() => setActiveTab('defense')} 
            icon={Shield} 
            label={TEXTS.tabs.defense} 
          />
           <TabButton 
            active={activeTab === 'tech'} 
            onClick={() => setActiveTab('tech')} 
            icon={Bot} 
            label={TEXTS.tabs.tech} 
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          {activeTab === 'player' && renderGrid(upgrades.player)}
          {activeTab === 'base' && renderGrid(upgrades.base)}
          {activeTab === 'defense' && renderGrid(upgrades.defense)}
          {activeTab === 'tech' && renderGrid(upgrades.tech)}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end items-center">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition flex items-center gap-2 shadow-xl shadow-green-900/20 uppercase tracking-wider"
            >
              <Play size={20} fill="currentColor" /> {TEXTS.close}
            </button>
        </div>

      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 font-bold flex items-center gap-2 transition-all rounded-t-lg whitespace-nowrap ${
      active 
        ? 'bg-slate-800 text-blue-400 border-t-2 border-blue-500' 
        : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
    }`}
  >
    <Icon size={18} /> {label}
  </button>
);

const ShoppingCartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
);