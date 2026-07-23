import React from 'react';
import { useGameStore } from '../store.ts';
import { X, Shield, Wrench, Zap, Package, Footprints, Gem, Circle, Terminal, Activity } from 'lucide-react';
import { getItemDef } from '../rules/items.ts';
import { ItemIcon, getRarityBorder } from './hud/HudShared.tsx';
import { GAME_CONFIG } from '../rules/config.ts';
import { getStatusModifiers } from '../services/hexUtils.ts';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const session = useGameStore(state => state.session);
  const player = session?.player;
  const equipment = player?.equipment || {};
  const bag = player?.inventory || [];
  const language = useGameStore(state => state.language);
  
  if (!isOpen || !player) return null;

  const handleEquip = (itemId: string) => {
    useGameStore.getState().equipItemSkirmish(itemId);
  };

  const handleUnequip = (slotName: string) => {
    useGameStore.getState().unequipItemSkirmish(slotName);
  };

  const renderEquipmentSlot = (slotName: string, icon: React.ReactNode, itemData?: any) => {
    const baseId = itemData?.baseId;
    const itemDef = baseId ? getItemDef(baseId) : null;
    const rarityClass = itemDef ? getRarityBorder(itemDef.rarity) : 'border-slate-800/50';
    
    return (
      <motion.div 
        whileHover={{ x: 2, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`bg-slate-900/40 border-2 rounded-xl p-2 flex items-center gap-2.5 transition-all group relative overflow-hidden ${rarityClass}`}
      >
        {itemDef && <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-60" />}
        <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-slate-500 overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform z-10">
          {itemDef ? <ItemIcon def={itemDef} size="w-6 h-6" /> : icon}
        </div>
        <div className="flex-1 min-w-0 z-10">
          <div className="text-[7px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1">{slotName}</div>
          <div className="text-[10px] text-white font-bold tracking-tight leading-tight uppercase font-mono truncate">
            {itemDef ? itemDef.name[language] : <span className="text-slate-700">-- EMPTY --</span>}
          </div>
        </div>
        {itemDef && (
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => handleUnequip(slotName)}
            className="p-1.5 bg-red-500/10 text-red-400 rounded-md border border-red-500/20 hover:bg-red-500/20 transition-colors z-20 cursor-pointer"
            title="Unequip (Destroys Item)"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </motion.div>
    );
  };

  const renderBagItem = (itemData: any, index: number) => {
    const baseId = itemData.baseId;
    const instanceId = itemData.id;
    const itemDef = getItemDef(baseId);
    if (!itemDef) return null;

    return (
      <motion.div 
        key={`${instanceId}-${index}`} 
        initial={{ opacity: 0, y: 15, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.02, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}
        className={`bg-slate-900/40 border-2 rounded-xl p-2.5 flex flex-col gap-2 transition-all group relative overflow-hidden ${getRarityBorder(itemDef.rarity)}`}
      >
        {/* Rarity Glow on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-current to-transparent pointer-events-none mix-blend-overlay" />
        
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
            <ItemIcon def={itemDef} size="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white font-black leading-tight uppercase tracking-tight truncate">{itemDef.name[language]}</div>
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-[0.1em] mt-0.5 font-mono">{itemDef.rarity}</div>
          </div>
        </div>
        
        <div className="text-[8px] text-slate-400 line-clamp-2 leading-snug h-8 font-mono break-words relative z-10">
          {itemDef.description[language]}
        </div>
        
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => handleEquip(instanceId)}
          className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-md border border-indigo-500/30 text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer relative z-10 whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {language === 'RU' ? 'Использовать' : 'Equip'}
        </motion.button>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl md:rounded-3xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-hidden flex flex-col relative"
        >
          {/* Ambient Effects */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal-600/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm shrink-0 z-20 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">LOCAL_ASSET_REPOSITORY</div>
                <h2 className="text-lg md:text-xl font-extrabold text-slate-100 uppercase tracking-wider leading-none">
                  {language === 'RU' ? 'Инвентарь' : 'Inventory'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80 leading-none mb-0.5">Credits</div>
                <div className="text-sm sm:text-base font-mono font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{player.coins}</div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 sm:p-4 relative z-10 flex flex-col lg:grid lg:grid-cols-[300px_1fr] gap-4">
            
            {/* Left Column: Equipment & Stats */}
            <div className="flex flex-col gap-4 lg:border-r lg:border-slate-800/50 lg:pr-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500" />
                <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                  {language === 'RU' ? 'Экипировка' : 'Equipment'}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {renderEquipmentSlot('head', <Shield className="w-4 h-4" />, equipment.head)}
                {renderEquipmentSlot('body', <Shield className="w-4 h-4" />, equipment.body)}
                {renderEquipmentSlot('feet', <Footprints className="w-4 h-4" />, equipment.feet)}
                {renderEquipmentSlot('tool', <Wrench className="w-4 h-4" />, equipment.tool)}
                {renderEquipmentSlot('artifact', <Zap className="w-4 h-4" />, equipment.artifact)}
              </div>

              {(() => {
                const modifiers = player ? getStatusModifiers(player, session) : null;
                if (!modifiers) return null;
                return (
                  <div className="mt-2 p-3 bg-slate-900/50 border border-indigo-500/20 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2 mb-1">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[9px] font-black uppercase text-indigo-300 tracking-[0.1em]">
                        {language === 'RU' ? 'Бонусы' : 'Passive Effects'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                      <div className="flex flex-col bg-slate-950/40 p-1.5 rounded-md border border-slate-900/50">
                        <span className="text-slate-500 text-[7px] uppercase font-bold tracking-wider mb-0.5">Move Cost</span>
                        <span className="text-amber-400 font-bold">{Math.round(modifiers.moveCostMultiplier * 100)}%</span>
                      </div>
                      <div className="flex flex-col bg-slate-950/40 p-1.5 rounded-md border border-slate-900/50">
                        <span className="text-slate-500 text-[7px] uppercase font-bold tracking-wider mb-0.5">Scan Radius</span>
                        <span className="text-sky-400 font-bold">{modifiers.fogRadius} hex</span>
                      </div>
                      <div className="flex flex-col bg-slate-950/40 p-1.5 rounded-md border border-slate-900/50">
                        <span className="text-slate-500 text-[7px] uppercase font-bold tracking-wider mb-0.5">Dig Yield</span>
                        <span className="text-emerald-400 font-bold">+{Math.round((modifiers.digRewardMultiplier - 1) * 100)}%</span>
                      </div>
                      <div className="flex flex-col bg-slate-950/40 p-1.5 rounded-md border border-slate-900/50">
                        <span className="text-slate-500 text-[7px] uppercase font-bold tracking-wider mb-0.5">Entropy Res</span>
                        <span className="text-purple-400 font-bold">{Math.round((1 - modifiers.entropyResistance) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Bag/Storage */}
            <div className="flex flex-col gap-3 min-h-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-indigo-500" />
                  <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                     {language === 'RU' ? 'Хранилище' : 'Storage'}
                  </h3>
                </div>
                <div className="text-[8px] font-mono font-black text-slate-500 flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800">
                  <span className="text-white">{bag.length}</span>/<span className="text-slate-600">{GAME_CONFIG.MAX_INVENTORY_SIZE}</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 -mr-1">
                {bag.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full min-h-[200px] flex flex-col items-center justify-center gap-4 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-xl"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Package className="w-12 h-12 text-slate-700" />
                    </motion.div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mb-1">BUFFER_EMPTY</div>
                      <div className="text-[10px] text-slate-600 font-mono italic">{language === 'RU' ? 'Нет предметов' : 'No items detected'}</div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                    {bag.map((item, idx) => renderBagItem(item, idx))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Mobile Footer */}
          <div className="sm:hidden p-3 bg-slate-900/60 border-t border-indigo-500/20 z-20 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-[0.3em] transition-all active:scale-95 border border-slate-700 rounded-lg shadow-lg cursor-pointer"
            >
              {language === 'RU' ? 'Закрыть' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InventoryModal;