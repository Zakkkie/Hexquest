import React from 'react';
import { useGameStore } from '../store.ts';
import { X, Shield, Wrench, Zap, Backpack, Package, Footprints, Gem, Circle } from 'lucide-react';
import { getItemDef } from '../rules/items.ts';
import { ItemIcon, getRarityBorder } from './hud/HudShared.tsx';
import { GAME_CONFIG } from '../rules/config.ts';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const { overworld, language, equipItem, unequipItem } = useGameStore();
  
  if (!isOpen) return null;

  const { player } = overworld;
  const { equipment, bag } = player;

  const renderEquipmentSlot = (slotName: string, icon: React.ReactNode, itemId?: string) => {
    const itemDef = itemId ? getItemDef(itemId) : null;
    
    return (
      <div className={`bg-slate-900/40 border rounded-xl p-2 flex items-center gap-2.5 transition-all group ${itemDef ? getRarityBorder(itemDef.rarity) : 'border-slate-800/50'}`}>
        <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center text-slate-600 overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform">
          {itemDef ? (
            <ItemIcon def={itemDef} size="w-6 h-6" />
          ) : (
            icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest truncate leading-none mb-1">{slotName}</div>
          <div className="text-[11px] text-white font-bold truncate leading-tight">
            {itemDef ? itemDef.name[language] : <span className="text-slate-700 italic font-medium">Empty</span>}
          </div>
        </div>
        {itemDef && (
          <button 
            onClick={() => unequipItem(slotName as any)}
            className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors active:scale-90"
            title="Unequip"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderBagItem = (itemId: string, index: number) => {
    const itemDef = getItemDef(itemId);
    if (!itemDef) return null;

    const isEquippable = !!itemDef.equipSlot;
    const equipSlot = itemDef.equipSlot;

    return (
      <div key={`${itemId}-${index}`} className={`bg-slate-900/40 border rounded-xl p-2 flex flex-col gap-2 transition-all group ${getRarityBorder(itemDef.rarity)}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform">
            <ItemIcon def={itemDef} size="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-white font-bold truncate leading-tight">{itemDef.name[language]}</div>
            <div className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-0.5">{itemDef.rarity}</div>
          </div>
        </div>
        <div className="text-[9px] text-slate-500 line-clamp-2 leading-tight h-6 italic">"{itemDef.description[language]}"</div>
        {isEquippable && (
          <button 
            onClick={() => equipItem(itemId, equipSlot as any, index)}
            className="w-full py-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-indigo-500/20"
          >
            {language === 'RU' ? 'Надеть' : 'Equip'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}>
      <div className="bg-slate-950 border border-slate-700 rounded-2xl md:rounded-3xl shadow-2xl max-w-[340px] md:max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 z-20"></div>
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Backpack className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight leading-none">
                {language === 'RU' ? 'Инвентарь' : 'Inventory'}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 font-mono">{player.credits} Cr</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        
        <div className="p-4 md:p-8 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6 md:gap-10 relative z-10 no-scrollbar">
          {/* Equipment Section */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 opacity-80">
                <Shield className="w-3.5 h-3.5" />
                {language === 'RU' ? 'Экипировка' : 'Equipment'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
              {renderEquipmentSlot('head', <Shield className="w-3.5 h-3.5" />, equipment.head)}
              {renderEquipmentSlot('body', <Shield className="w-3.5 h-3.5" />, equipment.body)}
              {renderEquipmentSlot('feet', <Footprints className="w-3.5 h-3.5" />, equipment.feet)}
              {renderEquipmentSlot('necklace', <Gem className="w-3.5 h-3.5" />, equipment.necklace)}
              {renderEquipmentSlot('ring', <Circle className="w-3.5 h-3.5" />, equipment.ring)}
              {renderEquipmentSlot('tool', <Wrench className="w-3.5 h-3.5" />, equipment.tool)}
              {renderEquipmentSlot('artifact', <Zap className="w-3.5 h-3.5" />, equipment.artifact)}
            </div>
          </div>

          {/* Bag Section */}
          <div className="flex-[1.5] flex flex-col gap-4">
            <h3 className="text-[10px] md:text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex justify-between items-center opacity-80">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                <span>{language === 'RU' ? 'Рюкзак' : 'Bag'}</span>
              </div>
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400 text-[9px] font-mono">{bag.length} / {GAME_CONFIG.MAX_INVENTORY_SIZE}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 no-scrollbar" style={{ maxHeight: '500px' }}>
              {bag.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-600 italic border border-dashed border-slate-800 rounded-2xl bg-slate-900/20 text-[10px] uppercase font-bold tracking-widest flex flex-col items-center gap-3">
                  <Package className="w-8 h-8 opacity-20" />
                  {language === 'RU' ? 'Пусто' : 'Empty'}
                </div>
              ) : (
                bag.map((item, idx) => renderBagItem(item, idx))
              )}
            </div>
          </div>
        </div>

        {/* Footer for mobile */}
        <div className="md:hidden p-3 bg-slate-900/50 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
          >
            {language === 'RU' ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
