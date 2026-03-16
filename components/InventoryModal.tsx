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
      <div className={`bg-slate-800/80 border rounded-lg md:rounded-xl p-2 md:p-3 flex items-center gap-2 md:gap-3 ${itemDef ? getRarityBorder(itemDef.rarity) : 'border-slate-600'}`}>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-md md:rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
          {itemDef ? (
            <ItemIcon def={itemDef} size="w-6 h-6 md:w-8 md:h-8" />
          ) : (
            icon
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] md:text-xs text-slate-400 font-bold uppercase truncate">{slotName}</div>
          <div className="text-xs md:text-sm text-white font-medium truncate">
            {itemDef ? itemDef.name[language] : <span className="text-slate-500 italic">Empty</span>}
          </div>
        </div>
        {itemDef && (
          <button 
            onClick={() => unequipItem(slotName as any)}
            className="px-1.5 py-0.5 md:px-2 md:py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-[9px] md:text-xs font-bold shrink-0"
          >
            UNEQUIP
          </button>
        )}
      </div>
    );
  };

  const renderBagItem = (itemId: string, index: number) => {
    // Check if it's a generic material or a specific item
    let name = itemId;
    let desc = '';
    let color = '#94a3b8';
    let itemDef: any = null;
    let isEquippable = false;
    let equipSlot = '';

    // Try to get from registry first
    itemDef = getItemDef(itemId);
    
    if (itemDef) {
      name = itemDef.name[language];
      desc = itemDef.description[language];
      color = itemDef.visualColor;
      
      if (itemDef.equipSlot) {
        isEquippable = true;
        equipSlot = itemDef.equipSlot;
      } else {
        // Fallback for older items
        if (itemId.includes('scanner')) { isEquippable = true; equipSlot = 'head'; }
        else if (itemId.includes('backpack') || itemId.includes('prism')) { isEquippable = true; equipSlot = 'body'; }
        else if (itemId.includes('drill')) { isEquippable = true; equipSlot = 'tool'; }
        else if (itemId.includes('core') || itemId.includes('overclocker')) { isEquippable = true; equipSlot = 'artifact'; }
      }
    } else if (itemId === 'SUPPLIES') {
      name = language === 'RU' ? 'Припасы' : 'Supplies';
      desc = language === 'RU' ? 'Восстанавливает энергию и здоровье.' : 'Restores energy and HP.';
      color = '#34d399';
    } else if (itemId === 'SCRAP') {
      name = language === 'RU' ? 'Металлолом' : 'Scrap';
      desc = language === 'RU' ? 'Материал для крафта или торговли.' : 'Material for crafting or trading.';
      color = '#94a3b8';
    } else if (itemId === 'SEALED_LETTER') {
      name = language === 'RU' ? 'Запечатанное Письмо' : 'Sealed Letter';
      desc = language === 'RU' ? 'Письмо с гербом Синдиката. Курьер просил доставить в Аванпост.' : 'A letter bearing the Syndicate seal. A courier asked you to deliver it.';
      color = '#f59e0b';
    } else if (itemId === 'PILGRIM_TOKEN') {
      name = language === 'RU' ? 'Жетон Братства' : 'Brotherhood Token';
      desc = language === 'RU' ? 'Открывает двери в тавернах и аванпостах Братства Пути.' : 'Opens doors at Brotherhood of the Road inns and outposts.';
      color = '#6366f1';
    } else if (itemId === 'ELDER_HERB') {
      name = language === 'RU' ? 'Травы Старца' : "Elder's Herbs";
      desc = language === 'RU' ? 'Лечебные травы от лесного хранителя. Пахнут сосной.' : 'Healing herbs from the forest keeper. Smell of pine.';
      color = '#34d399';
    } else if (itemId === 'MONASTERY_SIGN') {
      name = language === 'RU' ? 'Знак Монастыря' : 'Monastery Sign';
      desc = language === 'RU' ? 'Камень на шнурке. Монахи в горах узнают его.' : 'A stone on a cord. Mountain monks will recognize it.';
      color = '#a78bfa';
    } else if (itemId === 'ELDER_MAP') {
      name = language === 'RU' ? 'Карта Старца' : "Elder's Map";
      desc = language === 'RU' ? 'Карта, похищенная бандитами у лесного хранителя.' : 'A map stolen from the forest keeper by bandits.';
      color = '#f59e0b';
    } else if (itemId === 'HEARTSTONE_MAP') {
      name = language === 'RU' ? 'Карта Сердечного Камня' : 'Heartstone Map';
      desc = language === 'RU' ? 'Дар Старца. Ведёт к легендарному Сердечному Камню.' : "The Elder's gift. Leads to the legendary Heartstone.";
      color = '#ec4899';
    } else if (itemId === 'RUNIC_TABLET') {
      name = language === 'RU' ? 'Рунический Планшет' : 'Runic Tablet';
      desc = language === 'RU' ? 'Копия надписи с обелиска Строителей. Снимает проклятие руин.' : 'A copy of the Builder obelisk inscription. Can lift the ruins curse.';
      color = '#818cf8';
    } else if (itemId === 'MONASTERY_SCROLL') {
      name = language === 'RU' ? 'Свиток Монастыря' : 'Monastery Scroll';
      desc = language === 'RU' ? 'Древние знания о строительстве. Дар монахов.' : 'Ancient knowledge about construction. A gift from the monks.';
      color = '#c084fc';
    } else if (itemId === 'ANCIENT_MAP') {
      name = language === 'RU' ? 'Древняя Карта' : 'Ancient Map';
      desc = language === 'RU' ? 'Карта ночного торговца с отметками, которых нет нигде.' : "Night trader's map with marks found nowhere else.";
      color = '#fbbf24';
    } else if (itemId === 'EXILE_MARK') {
      name = language === 'RU' ? 'Метка Изгоев' : 'Exile Mark';
      desc = language === 'RU' ? 'Браслет дезертиров Синдиката. Открывает новые разговоры.' : 'A bracelet of Syndicate deserters. Opens new conversations.';
      color = '#f87171';
    }

    return (
      <div key={`${itemId}-${index}`} className={`bg-slate-800/80 border rounded-lg md:rounded-xl p-2 md:p-3 flex items-center gap-2 md:gap-3 ${itemDef ? getRarityBorder(itemDef.rarity) : 'border-slate-600'}`}>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-md md:rounded-lg flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: `${color}33`, border: `1px solid ${color}` }}>
          {itemDef ? (
            <ItemIcon def={itemDef} size="w-6 h-6 md:w-8 md:h-8" />
          ) : (
            <Package className="w-4 h-4 md:w-5 md:h-5" style={{ color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs md:text-sm text-white font-bold truncate">{name}</div>
          <div className="text-[10px] md:text-xs text-slate-400 truncate">{desc}</div>
        </div>
        {isEquippable && (
          <button 
            onClick={() => equipItem(itemId, equipSlot as any, index)}
            className="px-2 py-0.5 md:px-3 md:py-1 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30 text-[9px] md:text-xs font-bold shrink-0"
          >
            EQUIP
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.15)] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/10 blur-[80px] pointer-events-none" />

        <div className="p-4 md:p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30 relative z-10">
          <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-indigo-500/20 rounded-lg md:rounded-xl text-indigo-400">
              <Backpack className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            {language === 'RU' ? 'Инвентарь' : 'Inventory'}
          </h2>
          <button onClick={onClose} className="p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg md:rounded-xl transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        
        <div className="p-4 md:p-8 overflow-y-auto flex-1 flex flex-col md:flex-row gap-4 md:gap-8 relative z-10">
          {/* Equipment Section */}
          <div className="flex-1 flex flex-col gap-3 md:gap-5">
            <h3 className="text-[10px] md:text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3 md:w-4 md:h-4" />
              {language === 'RU' ? 'Экипировка' : 'Equipment'}
            </h3>
            <div className="flex flex-col gap-2 md:gap-4">
              {renderEquipmentSlot('head', <Shield className="w-4 h-4 md:w-5 md:h-5" />, equipment.head)}
              {renderEquipmentSlot('body', <Shield className="w-4 h-4 md:w-5 md:h-5" />, equipment.body)}
              {renderEquipmentSlot('feet', <Footprints className="w-4 h-4 md:w-5 md:h-5" />, equipment.feet)}
              {renderEquipmentSlot('necklace', <Gem className="w-4 h-4 md:w-5 md:h-5" />, equipment.necklace)}
              {renderEquipmentSlot('ring', <Circle className="w-4 h-4 md:w-5 md:h-5" />, equipment.ring)}
              {renderEquipmentSlot('tool', <Wrench className="w-4 h-4 md:w-5 md:h-5" />, equipment.tool)}
              {renderEquipmentSlot('artifact', <Zap className="w-4 h-4 md:w-5 md:h-5" />, equipment.artifact)}
            </div>
          </div>

          {/* Bag Section */}
          <div className="flex-1 flex flex-col gap-3 md:gap-5">
            <h3 className="text-[10px] md:text-sm font-bold text-indigo-400 uppercase tracking-widest flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="w-3 h-3 md:w-4 md:h-4" />
                <span>{language === 'RU' ? 'Рюкзак' : 'Bag'}</span>
              </div>
              <span className="bg-slate-800 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-slate-300 text-[10px] md:text-xs">{bag.length} / {GAME_CONFIG.MAX_INVENTORY_SIZE}</span>
            </h3>
            <div className="flex flex-col gap-2 md:gap-3 overflow-y-auto pr-1 md:pr-2 custom-scrollbar" style={{ maxHeight: '400px' }}>
              {bag.length === 0 ? (
                <div className="text-center p-6 md:p-10 text-slate-500 italic border border-dashed border-slate-700/50 rounded-xl md:rounded-2xl bg-slate-800/20 text-xs md:text-sm">
                  {language === 'RU' ? 'Рюкзак пуст' : 'Bag is empty'}
                </div>
              ) : (
                bag.map((item, idx) => renderBagItem(item, idx))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
