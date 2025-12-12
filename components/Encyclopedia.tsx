import React, { useState, useEffect } from 'react';
import { Book, Skull, AlertTriangle, Shield, Wind, Zap, Lock, ChevronRight, BarChart3, Crosshair, Biohazard, Snowflake, Flame, Crown } from 'lucide-react';
import { ZombieType } from '../types';

interface EncyclopediaProps {
  unlockedTypes: ZombieType[];
  onClose: () => void;
}

// English only static text
const TEXTS = {
  title: "Threat Database",
  records: "Variation Records",
  close: "Close",
  unknown: "???",
  analysisAvailable: "Threat Analysis Available",
  noData: "No Data",
  unknownEntity: "UNKNOWN ENTITY",
  locked: "LOCKED DATA",
  tacticalAnalysis: "TACTICAL ANALYSIS",
  metrics: "Performance Metrics",
  durability: "Durability",
  speed: "Speed",
  damage: "Damage Potential",
  weakness: "WEAKNESS",
  accessDenied: "DATA ACCESS DENIED",
  accessDeniedDesc: "This zombie type has not been encountered yet. Engage this threat on the battlefield to unlock data.",
  stats: {
    low: "Low", medium: "Medium", high: "High", veryHigh: "Very High", extreme: "Extreme",
    veryLow: "Very Low", veryFast: "Very Fast", slow: "Slow", verySlow: "Very Slow",
    critical: "Critical", chemical: "Chemical", explosive: "Explosive", devastating: "Devastating",
    boss: "BOSS LEVEL"
  }
};

// Static data
const ZOMBIE_DATA: Record<ZombieType, { 
  name: string; 
  desc: string; 
  weakness: string; 
  stats: { hp: string; speed: string; dmg: string };
  color: string;
  borderColor?: string;
  radius: number;
  icon: any;
}> = {
  [ZombieType.NORMAL]: {
    name: "Walker",
    desc: "The most common infected type. Harmless alone, deadly in swarms. Retains basic motor functions and is sensitive to sound.",
    weakness: "Firepower and explosives.",
    stats: { hp: "low", speed: "medium", dmg: "low" },
    color: '#22c55e',
    radius: 15,
    icon: Skull
  },
  [ZombieType.RUNNER]: {
    name: "Runner",
    desc: "Infection has overstimulated the nervous system. Moves erratically at incredible speeds. Hard to target.",
    weakness: "Turrets and rapid fire.",
    stats: { hp: "veryLow", speed: "veryFast", dmg: "medium" },
    color: '#ef4444',
    radius: 12,
    icon: Wind
  },
  [ZombieType.ARMORED]: {
    name: "Armored",
    desc: "Former military or police personnel. Highly resistant to light arms due to body armor and helmets.",
    weakness: "Armor piercing ammo or high damage.",
    stats: { hp: "high", speed: "medium", dmg: "medium" },
    color: '#94a3b8',
    borderColor: '#ffffff',
    radius: 16,
    icon: Shield
  },
  [ZombieType.TANK]: {
    name: "Tank",
    desc: "Extreme mutation has covered the bone structure with muscle mass. Very slow but absorbs bullets like a sponge.",
    weakness: "Sustained damage and kiting.",
    stats: { hp: "veryHigh", speed: "slow", dmg: "high" },
    color: '#581c87',
    borderColor: '#e9d5ff',
    radius: 28,
    icon: Shield
  },
  [ZombieType.SPITTER]: {
    name: "Spitter",
    desc: "Stomach acid has mutated. Can spit acid from a distance or create a toxic pool nearby.",
    weakness: "Destroy before it gets close.",
    stats: { hp: "medium", speed: "medium", dmg: "chemical" },
    color: '#84cc16',
    borderColor: '#bef264',
    radius: 18,
    icon: Biohazard
  },
  [ZombieType.EXPLODER]: {
    name: "Exploder",
    desc: "Volatile gases accumulate in the body. Explodes on death or proximity, dealing massive damage. Kill from afar.",
    weakness: "Long range elimination.",
    stats: { hp: "medium", speed: "medium", dmg: "explosive" },
    color: '#f97316',
    radius: 18,
    icon: AlertTriangle
  },
  [ZombieType.GHOST]: {
    name: "Ghost",
    desc: "Has translucent skin that refracts light. Hard to see and approaches stealthily. Only glows slightly when moving.",
    weakness: "Careful observation and AoE damage.",
    stats: { hp: "low", speed: "high", dmg: "medium" },
    color: 'rgba(100, 100, 255, 0.4)',
    radius: 14,
    icon: Zap
  },
  [ZombieType.ASSASSIN]: {
    name: "Assassin",
    desc: "Adapted to darkness, small and deadly. Targets the player directly and deals critical damage.",
    weakness: "Reflex shots.",
    stats: { hp: "low", speed: "veryFast", dmg: "critical" },
    color: '#000000',
    borderColor: '#ef4444',
    radius: 10,
    icon: Crosshair
  },
  [ZombieType.INFECTOR]: {
    name: "Infector",
    desc: "A carrier of pure strain virus. Upon death, the body ruptures and releases multiple Runners.",
    weakness: "Explosives to clear minions instantly.",
    stats: { hp: "medium", speed: "medium", dmg: "medium" },
    color: '#86198f', // Dark Purple
    borderColor: '#22c55e',
    radius: 20,
    icon: Biohazard
  },
  [ZombieType.FROST]: {
    name: "Frostbite",
    desc: "Body emits extreme cold. Attacks slow down the player significantly, making escape difficult.",
    weakness: "Do not let it touch you.",
    stats: { hp: "high", speed: "slow", dmg: "medium" },
    color: '#06b6d4', // Cyan
    borderColor: '#cffafe',
    radius: 22,
    icon: Snowflake
  },
  [ZombieType.BERSERKER]: {
    name: "Berserker",
    desc: "Adrenaline fueled rage. As it takes damage, it moves faster and hits harder.",
    weakness: "Kill it quickly before it enrages.",
    stats: { hp: "high", speed: "variable", dmg: "high" },
    color: '#991b1b', // Deep Red
    borderColor: '#fca5a5',
    radius: 19,
    icon: Flame
  },
  [ZombieType.GIANT]: {
    name: "Titan",
    desc: "A rare massive mutation. The biggest threat on the battlefield. Capable of destroying the base alone.",
    weakness: "Focus all firepower.",
    stats: { hp: "extreme", speed: "verySlow", dmg: "devastating" },
    color: '#3f3f46',
    borderColor: '#000000',
    radius: 45,
    icon: Skull
  },
  [ZombieType.BOSS_WARLORD]: {
    name: "WARLORD (BOSS)",
    desc: "The alpha of the horde. Possesses immense durability and destructive power. Appears every 5 waves.",
    weakness: "Everything you have.",
    stats: { hp: "boss", speed: "medium", dmg: "boss" },
    color: '#450a0a',
    borderColor: '#ef4444',
    radius: 60,
    icon: Crown
  }
};

export const Encyclopedia: React.FC<EncyclopediaProps> = ({ unlockedTypes, onClose }) => {
  const allTypes = Object.values(ZombieType);
  const [selectedType, setSelectedType] = useState<ZombieType | null>(null);

  // Auto-select the first unlocked zombie on open
  useEffect(() => {
    if (unlockedTypes.length > 0 && !selectedType) {
      setSelectedType(unlockedTypes[0]);
    }
  }, []);

  const selectedData = selectedType ? ZOMBIE_DATA[selectedType] : null;
  const isSelectedUnlocked = selectedType ? unlockedTypes.includes(selectedType) : false;

  const getStatLabel = (key: string) => {
    return TEXTS.stats[key as keyof typeof TEXTS.stats] || key;
  };

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-slate-600 rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900/30 p-2 rounded-full border border-blue-500/50">
              <Book className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase">{TEXTS.title}</h2>
              <p className="text-slate-400 font-mono text-xs">{TEXTS.records}: {unlockedTypes.length} / {allTypes.length}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition uppercase tracking-wider text-sm"
          >
            {TEXTS.close}
          </button>
        </div>

        {/* Content Body - Split View */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar: List */}
          <div className="w-1/3 md:w-1/4 bg-slate-950/50 border-r border-slate-700 overflow-y-auto">
            <div className="p-2 space-y-1">
              {allTypes.map((type) => {
                const isUnlocked = unlockedTypes.includes(type);
                const data = ZOMBIE_DATA[type];
                const isActive = selectedType === type;
                
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`w-full text-left p-4 rounded-lg flex items-center gap-3 transition-all border ${
                      isActive 
                        ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                        : 'bg-transparent border-transparent hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isUnlocked ? <data.icon size={20} /> : <Lock size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {isUnlocked ? data.name : TEXTS.unknown}
                      </div>
                      <div className="text-xs text-slate-600 uppercase font-mono truncate">
                        {isUnlocked ? TEXTS.analysisAvailable : TEXTS.noData}
                      </div>
                    </div>
                    {isActive && <ChevronRight size={16} className="text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Area: Details */}
          <div className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-slate-900">
            {selectedType && (
              <div className="p-8 h-full flex flex-col">
                
                {/* Dossier Header */}
                <div className="flex items-start justify-between border-b border-slate-700 pb-6 mb-6">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded font-mono border border-slate-700">
                          ID: {selectedType.toUpperCase()}-{Math.floor(Math.random()*1000)}
                        </span>
                        {!isSelectedUnlocked && (
                          <span className="bg-red-900/50 text-red-400 text-xs px-2 py-1 rounded font-mono border border-red-800 flex items-center gap-1">
                            <Lock size={10} /> {TEXTS.locked}
                          </span>
                        )}
                     </div>
                     <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                       {isSelectedUnlocked ? selectedData?.name : TEXTS.unknownEntity}
                     </h1>
                  </div>
                  
                  {/* Visual Preview */}
                  <div className="w-32 h-32 rounded-xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                     {isSelectedUnlocked && selectedData ? (
                       <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                          {/* Grid Background */}
                          <div className="absolute inset-0 opacity-20" style={{ 
                            backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                            backgroundSize: '10px 10px' 
                          }}></div>
                          
                          {/* The Zombie Shape */}
                          <div 
                            style={{
                              width: selectedData.radius * 2,
                              height: selectedData.radius * 2,
                              backgroundColor: selectedData.color,
                              border: selectedData.borderColor ? `3px solid ${selectedData.borderColor}` : 'none',
                              borderRadius: '50%',
                              boxShadow: '0 0 15px rgba(0,0,0,0.5)'
                            }}
                            className="relative"
                          >
                             {/* Health Bar Imitation */}
                             <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500">
                               <div className="h-full bg-green-500 w-full"></div>
                             </div>
                          </div>
                       </div>
                     ) : (
                       <span className="text-6xl text-slate-700">?</span>
                     )}
                  </div>
                </div>

                {/* Dossier Body */}
                {isSelectedUnlocked && selectedData ? (
                  <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                    
                    {/* Description */}
                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                      <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                        <InfoIcon /> {TEXTS.tacticalAnalysis}
                      </h3>
                      <p className="text-slate-300 leading-relaxed text-lg">
                        {selectedData.desc}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Stats */}
                      <div className="bg-slate-800/30 p-5 rounded-lg border border-slate-700">
                         <h4 className="text-slate-500 font-bold mb-4 flex items-center gap-2 text-sm uppercase">
                           <BarChart3 size={16} /> {TEXTS.metrics}
                         </h4>
                         <div className="space-y-4">
                            <StatBar label={TEXTS.durability} value={getStatLabel(selectedData.stats.hp)} color="bg-green-500" />
                            <StatBar label={TEXTS.speed} value={getStatLabel(selectedData.stats.speed)} color="bg-blue-500" />
                            <StatBar label={TEXTS.damage} value={getStatLabel(selectedData.stats.dmg)} color="bg-red-500" />
                         </div>
                      </div>

                      {/* Weakness */}
                      <div className="bg-red-950/20 p-5 rounded-lg border border-red-900/30 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2 text-red-500 font-bold text-lg">
                          <AlertTriangle size={24} />
                          {TEXTS.weakness}
                        </div>
                        <p className="text-red-200/80 text-lg">
                          {selectedData.weakness}
                        </p>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-50">
                    <Lock size={64} />
                    <div className="text-2xl font-black tracking-widest">{TEXTS.accessDenied}</div>
                    <p className="text-sm font-mono text-center max-w-md">
                      {TEXTS.accessDeniedDesc}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper Component for Stats
const StatBar = ({ label, value, color }: { label: string, value: string, color: string }) => {
  let width = '30%';
  if (value.includes('High') || value.includes('Fast')) width = '75%';
  if (value.includes('Very') || value.includes('Extreme') || value.includes('Devastating') || value.includes('BOSS')) width = '95%';
  if (value.includes('Low')) width = '25%';
  if (value.includes('Medium')) width = '50%';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-bold">{value}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width }}></div>
      </div>
    </div>
  );
};

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);