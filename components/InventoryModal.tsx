import React from 'react';
import { useGameStore } from '../store.ts';
import { X, Shield, Wrench, Zap, Package, Footprints, Gem, Circle, Terminal, Activity } from 'lucide-react';
import { getItemDef } from '../rules/items.ts';
import { ItemIcon, getRarityBorder } from './hud/HudShared.tsx';
import { GAME_CONFIG } from '../rules/config.ts';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const { overworld, session, language } = useGameStore();
  
  if (!isOpen) return null;

  const isSkirmish = !!session?.grid;
  
  const player = isSkirmish ? session.player : overworld.player;
  const equipment = isSkirmish ? session.player.equipment || {} : overworld.player.equipment;
  const bag = isSkirmish ? session.player.inventory : overworld.player.bag;

  const handleEquip = (itemId: string, equipSlot: string, index: number) => {
    if (isSkirmish) {
      // processPlayerAction is missing, we must add it to store, or just use useGameStore().equipItemSkirmish which we will define
      useGameStore.getState().equipItemSkirmish(itemId);
    } else {
      useGameStore.getState().equipItem(itemId, equipSlot as any, index);
    }
  };

  const handleUnequip = (slotName: string) => {
    if (isSkirmish) {
      useGameStore.getState().unequipItemSkirmish(slotName);
    } else {
      useGameStore.getState().unequipItem(slotName as any);
    }
  };

  const renderEquipmentSlot = (slotName: string, icon: React.ReactNode, itemData?: any) => {
    // In overworld, itemData is string (baseId). In skirmish, itemData is Item object.
    const baseId = typeof itemData === 'string' ? itemData : itemData?.baseId;
    const itemDef = baseId ? getItemDef(baseId) : null;
    
    return (
      <div className={`bg-slate-900/40 border-2 rounded-lg p-2.5 flex items-center gap-3 transition-all group relative overflow-hidden ${itemDef ? getRarityBorder(itemDef.rarity) : 'border-slate-800/40'}`}>
        {itemDef && <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-60" />}
        <div className="w-10 h-10 rounded-md bg-slate-950 flex items-center justify-center text-slate-600 overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform z-10">
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
            className="p-1.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 hover:bg-red-500/20 transition-colors active:scale-90 z-20"
            title="Unequip (Destroys Item)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const renderBagItem = (itemData: any, index: number) => {
    // In overworld, itemData is string (baseId). In skirmish, itemData is Item object.
    const baseId = typeof itemData === 'string' ? itemData : itemData.baseId;
    const instanceId = typeof itemData === 'string' ? itemData : itemData.id;
    const itemDef = getItemDef(baseId);
    if (!itemDef) return null;

    // For skirmish, we can allow ANY item to be equipped. So isEquippable is true if isSkirmish, or if it has a specific slot.
    const isEquippable = isSkirmish ? true : !!itemDef.equipSlot;
    const equipSlot = itemDef.equipSlot || 'artifact';

    return (
      <div key={`${instanceId}-${index}`} className={`bg-slate-900/40 border-2 rounded-lg p-2.5 flex flex-col gap-2.5 transition-all group relative overflow-hidden ${getRarityBorder(itemDef.rarity)}`}>
        <div className="absolute top-0 right-0 p-1 opacity-20"><Activity className="w-3 h-3" /></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform">
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
            onClick={() => handleEquip(instanceId, equipSlot, index)}
            className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95"
          >
            {language === 'RU' ? 'Одеть (Использовать)' : 'Equip (Use)'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 pointer-events-auto animate-in fade-in" onClick={onClose}>
      <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-lg shadow-[0_0_50px_rgba(79,70,229,0.2)] max-w-lg md:max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 relative group" onClick={e => e.stopPropagation()}>
        {/* Scanline effect */}
        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 animate-scan-slow z-10" />
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-indigo-500/30 flex justify-between items-center bg-indigo-900/10 relative z-20">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-500/20 rounded border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Terminal className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none mb-1">LOCAL_ASSET_REPOSITORY</div>
              <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-widest leading-none">
                {language === 'RU' ? 'Инвентарь' : 'Inventory'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
                <div className="text-[10px] font-black tracking-widest text-emerald-400/60 leading-none mb-1">CREDITS_AVAILABLE</div>
                <div className="text-xl font-mono font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{isSkirmish ? (player as any).coins : (player as any).credits}</div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-8 overflow-y-auto flex-1 flex flex-col md:grid md:grid-cols-12 gap-8 relative z-20 no-scrollbar">
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
          </div>

          {/* Bag Section */}
          <div className="md:col-span-8 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-1 h-4 bg-indigo-500" />
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                   {language === 'RU' ? 'Хранилище' : 'Storage'}
                </h3>
              </div>
              <div className="text-[10px] font-mono font-black text-slate-500 flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                CAPACITY: <span className="text-white">{bag.length}</span>/<span className="text-white">{GAME_CONFIG.MAX_INVENTORY_SIZE}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 no-scrollbar min-h-0">
              {bag.length === 0 ? (
                <div className="col-span-full py-16 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center gap-4 group/empty transition-colors hover:bg-slate-900/50">
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
        <div className="md:hidden p-4 bg-slate-900/50 border-t border-indigo-500/30 z-20 flex justify-between items-center">
            <div className="flex flex-col">
                <div className="text-[8px] font-black tracking-widest text-emerald-400/60 leading-none mb-1 uppercase">Credits</div>
                <div className="text-lg font-mono font-black text-emerald-400">{isSkirmish ? (player as any).coins : (player as any).credits}</div>
            </div>
            <button
                onClick={onClose}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-[0.3em] transition-all active:scale-95 border border-slate-700 rounded shadow-lg"
            >
                {language === 'RU' ? 'Закрыть' : 'Close'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
