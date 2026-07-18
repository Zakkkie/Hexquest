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
    
    return (
      <motion.div 
        whileHover={{ x: 2, scale: 1.01 }}
        className={`bg-slate-900/30 border-2 rounded-xl p-2.5 flex items-center gap-3 transition-all group relative overflow-hidden ${itemDef ? getRarityBorder(itemDef.rarity) : 'border-slate-800/30'}`}
      >
        {itemDef && <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-60" />}
        <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-slate-600 overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform z-10">
          {itemDef ? (
            <ItemIcon def={itemDef} size="w-7 h-7" />
          ) : (
            icon
          )}
        </div>
        <div className="flex-1 min-w-0 z-10">
          <div className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mb-1 break-words whitespace-pre-wrap">{slotName}</div>
          <div className="text-[11px] text-white font-bold tracking-tight leading-tight break-words whitespace-pre-wrap uppercase font-mono">
            {itemDef ? itemDef.name[language] : <span className="text-slate-800 opacity-40">-- UNKNOWN --</span>}
          </div>
        </div>
        {itemDef && (
          <button 
            onClick={() => handleUnequip(slotName)}
            className="p-1.5 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors active:scale-90 z-20 cursor-pointer"
            title="Unequip (Destroys Item)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    );
  };

  const renderBagItem = (itemData: any, index: number) => {
    // All modes use Item object now
    const baseId = itemData.baseId;
    const instanceId = itemData.id;
    const itemDef = getItemDef(baseId);
    if (!itemDef) return null;

    // For skirmish/campaign, we allow items to be equipped.
    const isEquippable = true;

    return (
      <motion.div 
        key={`${instanceId}-${index}`} 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 20 }}
        whileHover={{ y: -2, boxShadow: "0 4px 20px rgba(99, 102, 241, 0.1)" }}
        className={`bg-slate-900/30 border-2 rounded-xl p-3 flex flex-col gap-2.5 transition-all group relative overflow-hidden ${getRarityBorder(itemDef.rarity)}`}
      >
        <div className="absolute top-0 right-0 p-1 opacity-20"><Activity className="w-3 h-3" /></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform">
            <ItemIcon def={itemDef} size="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white font-black leading-tight break-words whitespace-pre-wrap uppercase tracking-tight">{itemDef.name[language]}</div>
            <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] mt-0.5 break-words whitespace-pre-wrap font-mono opacity-80">{itemDef.rarity}</div>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed h-8 font-mono break-words whitespace-pre-wrap opacity-60">
          <span className="text-slate-600 mr-1">&gt;</span>
          {itemDef.description[language]}
        </div>
        {isEquippable && (
          <button 
            onClick={() => handleEquip(instanceId)}
            className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 cursor-pointer"
          >
            {language === 'RU' ? 'Одеть (Использовать)' : 'Equip (Use)'}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-auto">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal content container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-slate-950/45 backdrop-blur-xl border border-indigo-500/25 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] max-w-lg md:max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden relative group"
        >
          {/* Cyber Corner Brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />

          {/* Scanline effect */}
          <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5 animate-scan-slow z-10" />
          
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-indigo-500/20 flex justify-between items-center bg-indigo-950/20 relative z-20">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-indigo-500/15 rounded-lg border border-indigo-500/35 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Terminal className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none mb-1">LOCAL_ASSET_REPOSITORY</div>
                <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest leading-none">
                  {language === 'RU' ? 'Инвентарь' : 'Inventory'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex flex-col items-end">
                  <div className="text-[10px] font-black tracking-widest text-emerald-400/60 leading-none mb-1">CREDITS_AVAILABLE</div>
                  <div className="text-xl font-mono font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{player.coins}</div>
              </div>
              <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer">
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-8 overflow-y-auto flex-1 flex flex-col md:grid md:grid-cols-12 gap-8 relative z-20 no-scrollbar">
            {(() => {
              const modifiers = player ? getStatusModifiers(player, session) : null;
              return (
                <>
                  {/* Equipment Section */}
                  <div className="md:col-span-4 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-4 bg-indigo-500" />
                      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                        {language === 'RU' ? 'Активная Экипировка' : 'Active Equipment'}
                      </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      {renderEquipmentSlot('head', <Shield className="w-4 h-4" />, equipment.head)}
                      {renderEquipmentSlot('body', <Shield className="w-4 h-4" />, equipment.body)}
                      {renderEquipmentSlot('feet', <Footprints className="w-4 h-4" />, equipment.feet)}
                      {renderEquipmentSlot('necklace', <Gem className="w-4 h-4" />, equipment.necklace)}
                      {renderEquipmentSlot('ring', <Circle className="w-4 h-4" />, equipment.ring)}
                      {renderEquipmentSlot('tool', <Wrench className="w-4 h-4" />, equipment.tool)}
                      {renderEquipmentSlot('artifact', <Zap className="w-4 h-4" />, equipment.artifact)}
                    </div>

                    {modifiers && (
                      <div className="mt-3 p-4 bg-slate-900/40 border border-indigo-500/20 rounded-xl flex flex-col gap-2.5 relative">
                        <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[10px] font-black uppercase text-indigo-300 tracking-[0.1em]">
                            {language === 'RU' ? 'Пассивные Бонусы' : 'Passive Equipment Effects'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-900/50">
                            <span className="text-slate-500 text-[8px] uppercase font-sans font-extrabold tracking-wider leading-none mb-1">
                              {language === 'RU' ? 'Расход Энергии' : 'Move Cost'}
                            </span>
                            <span className="text-amber-400 font-bold text-xs uppercase">
                              {Math.round(modifiers.moveCostMultiplier * 100)}%
                            </span>
                          </div>
                          <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-900/50">
                            <span className="text-slate-500 text-[8px] uppercase font-sans font-extrabold tracking-wider leading-none mb-1">
                              {language === 'RU' ? 'Радиус Обзора' : 'Scan Radius'}
                            </span>
                            <span className="text-sky-400 font-bold text-xs uppercase">
                              {modifiers.fogRadius} hex
                            </span>
                          </div>
                          <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-900/50">
                            <span className="text-slate-500 text-[8px] uppercase font-sans font-extrabold tracking-wider leading-none mb-1">
                              {language === 'RU' ? 'Добыча Бура' : 'Dig Yield'}
                            </span>
                            <span className="text-emerald-400 font-bold text-xs uppercase">
                              +{Math.round((modifiers.digRewardMultiplier - 1) * 100)}%
                            </span>
                          </div>
                          <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-900/50">
                            <span className="text-slate-500 text-[8px] uppercase font-sans font-extrabold tracking-wider leading-none mb-1">
                              {language === 'RU' ? 'Защита от Распада' : 'Reality Guard'}
                            </span>
                            <span className="text-purple-400 font-bold text-xs uppercase">
                              {Math.round((1 - modifiers.entropyResistance) * 100)}%
                            </span>
                          </div>
                          <div className="flex flex-col bg-slate-950/40 p-2 rounded-lg border border-slate-900/50 col-span-2">
                            <span className="text-slate-500 text-[8px] uppercase font-sans font-extrabold tracking-wider leading-none mb-1">
                              {language === 'RU' ? 'Скорость Роста Экосистем' : 'Growth Acceleration'}
                            </span>
                            <span className="text-indigo-400 font-bold text-xs uppercase">
                              +{modifiers.growthAccelerator} epochs / turn
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Bag Section */}
            <div className="md:col-span-8 flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 bg-indigo-500" />
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                     {language === 'RU' ? 'Хранилище' : 'Storage'}
                  </h3>
                </div>
                <div className="text-[10px] font-mono font-black text-slate-500 flex items-center gap-2 bg-slate-900/55 px-3 py-1 rounded-full border border-slate-800">
                  CAPACITY: <span className="text-white">{bag.length}</span>/<span className="text-white">{GAME_CONFIG.MAX_INVENTORY_SIZE}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 no-scrollbar min-h-0">
                {bag.length === 0 ? (
                  <div className="col-span-full py-16 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center gap-4 group/empty transition-colors hover:bg-slate-900/45">
                    <div className="p-4 rounded-full bg-slate-800/50 group-hover/empty:scale-110 transition-transform">
                      <Package className="w-10 h-10 text-slate-600 group-hover:text-slate-400" />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-1">BUFFER_EMPTY</div>
                      <div className="text-xs text-slate-500 font-mono italic">{language === 'RU' ? 'Предметы отсутствуют' : 'No items detected'}</div>
                    </div>
                  </div>
                ) : (
                  bag.map((item, idx) => renderBagItem(item, idx))
                )}
              </div>
            </div>
          </div>

          {/* Footer info (credits for mobile) */}
          <div className="md:hidden p-4 bg-slate-900/50 border-t border-indigo-500/20 z-20 flex justify-between items-center">
              <div className="flex flex-col">
                  <div className="text-[8px] font-black tracking-widest text-emerald-400/60 leading-none mb-1 uppercase">Credits</div>
                  <div className="text-lg font-mono font-black text-emerald-400">{player.coins}</div>
              </div>
              <button
                  onClick={onClose}
                  className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-[0.3em] transition-all active:scale-95 border border-slate-700 rounded-lg shadow-lg cursor-pointer"
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
