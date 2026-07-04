import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useGameStore } from '../store.ts';
import { getHexKey } from '../services/hexUtils.ts';
import { Hex, LevelConfig, WinCondition, BotObjective } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, Plus, Minus, Download, Upload, Play, Copy, 
  Shield, Activity, Sparkles, Map as MapIcon, Bot, 
  Hammer, X, ChevronLeft, Sliders
} from 'lucide-react';
import { LevelExitDialog } from './hud/LevelExitDialog.tsx';

interface CustomHex {
  q: number;
  r: number;
  currentLevel: number;
  maxLevel: number;
  structureType: 'NONE' | 'BARRIER' | 'VOID' | 'MONUMENT' | 'MINE' | 'MINI_MONUMENT';
  ownerId: string | null; // null | 'player' | 'bot_0' | 'bot_1' etc.
  durability?: number;
}

interface EditorHexCellProps {
  hex: CustomHex;
  cellColor: string;
  isPlayerSp: boolean;
  botSpIdx: number | null;
  hexPolPoints: string;
  hexRadius: number;
  onMouseDown: (key: string, e: React.MouseEvent) => void;
  onMouseEnter: (key: string) => void;
}

const SQRT_3 = Math.sqrt(3);
const SQRT_3_DIV_2 = SQRT_3 / 2;

const EditorHexCell: React.FC<EditorHexCellProps> = React.memo(({
  hex,
  cellColor,
  isPlayerSp,
  botSpIdx,
  hexPolPoints,
  hexRadius,
  onMouseDown,
  onMouseEnter
}) => {
  const key = getHexKey(hex.q, hex.r);
  const size = hexRadius;
  const cx = size * (SQRT_3 * hex.q + SQRT_3_DIV_2 * hex.r);
  const cy = size * (1.5 * hex.r) * 0.8;

  return (
    <g 
      transform={`translate(${cx}, ${cy})`}
      onMouseDown={(e) => onMouseDown(key, e)}
      onMouseEnter={() => onMouseEnter(key)}
      className="transition-all duration-100 group cursor-pointer"
    >
      {/* Shadow */}
      <polygon 
        points={hexPolPoints} 
        fill="rgba(0,0,0,0.5)" 
        transform="translate(2, 4)"
        className="pointer-events-none"
      />
      {/* Primary Poly */}
      <polygon 
        points={hexPolPoints} 
        fill={cellColor} 
        stroke="#1e293b" 
        strokeWidth={1}
        className="transition-all duration-150 hover:stroke-[#818cf8] hover:stroke-[2.5px] hover:brightness-125"
      />

      {/* Structure Icons or indicators */}
      {hex.structureType === 'VOID' && (
        <g className="pointer-events-none">
          <line x1={-9} y1={-5} x2={9} y2={5} stroke="#3b0764" strokeWidth={2} opacity={0.7} />
          <line x1={-9} y1={5} x2={9} y2={-5} stroke="#3b0764" strokeWidth={2} opacity={0.7} />
          <circle cx={0} cy={0} r={4.5} fill="#000000" stroke="#f43f5e" strokeWidth={1} />
        </g>
      )}

      {hex.structureType === 'BARRIER' && (
        <g className="pointer-events-none">
          <polygon points="-12,-8 12,-8 8,3 -8,3" fill="#475569" stroke="#64748b" strokeWidth={1} />
          <polygon points="-12,-8 -8,3 -8,8 -12,8" fill="#1e293b" />
          <polygon points="8,3 12,-8 12,8 8,8" fill="#334155" />
        </g>
      )}

      {hex.structureType === 'MONUMENT' && (
        <g className="pointer-events-none">
          <ellipse cx={0} cy={6} rx={9} ry={3} fill="#78350f" opacity={0.65} />
          <polygon points="0,-16 -6,-10 -6,4 0,6" fill="#f59e0b" stroke="#ffffff" strokeWidth={0.5} />
          <polygon points="0,-16 6,-10 6,4 0,6" fill="#d97706" stroke="#ffffff" strokeWidth={0.5} />
          <circle cx={0} cy={-4} r={2.5} fill="#fef08a" />
        </g>
      )}

      {hex.structureType === 'MINE' && (
        <g className="pointer-events-none">
          <circle cx={0} cy={0} r={9} fill="none" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="3 2" />
          <polygon points="0,-7 3,0 2,5 -2,5 -3,0" fill="#a5b4fc" stroke="#4f46e5" strokeWidth={1} />
          <circle cx={0} cy={0} r={3} fill="#f43f5e" />
        </g>
      )}

      {hex.structureType === 'MINI_MONUMENT' && (
        <g className="pointer-events-none">
          <ellipse cx={0} cy={5} rx={6} ry={2} fill="#581c87" opacity={0.65} />
          <polygon points="0,-11 -5,-5 -5,3 0,5" fill="#c084fc" />
          <polygon points="0,-11 5,-5 5,3 0,5" fill="#a855f7" />
          <circle cx={0} cy={-2} r={1.5} fill="#f3e8ff" />
        </g>
      )}

      {/* Level Numbers overlay */}
      {hex.structureType !== 'VOID' && (
        <text 
          x={0} 
          y={hex.structureType === 'NONE' ? 4 : 15} 
          textAnchor="middle" 
          fill={hex.currentLevel < 0 ? '#cbd5e1' : hex.currentLevel > 1 ? '#ffffff' : '#94a3b8'} 
          className="text-[9px] font-mono font-black pointer-events-none text-shadow-md select-none leading-none"
        >
          {hex.currentLevel === 0 ? 'L0' : hex.currentLevel > 0 ? `L${hex.currentLevel}` : `${hex.currentLevel}`}
        </text>
      )}

      {/* Owner border glowing */}
      {hex.ownerId && (
        <circle 
          cx={0} 
          cy={0} 
          r={18} 
          fill="none" 
          stroke={hex.ownerId === 'player' ? '#2563eb' : '#e11d48'} 
          strokeWidth={1.5} 
          strokeDasharray="4 2" 
          className="pointer-events-none"
        />
      )}

      {/* Spawns */}
      {isPlayerSp && (
        <g transform="translate(0, -12)" className="pointer-events-none">
          <rect x={-10} y={-5} width={20} height={10} fill="#2563eb" rx={2} />
          <text x={0} y={3} textAnchor="middle" fill="#fff" className="text-[7px] font-mono font-black uppercase">P</text>
        </g>
      )}

      {botSpIdx !== null && (
        <g transform="translate(0, 12)" className="pointer-events-none">
          <rect x={-10} y={-5} width={20} height={10} fill="#e11d48" rx={2} />
          <text x={0} y={3} textAnchor="middle" fill="#fff" className="text-[7px] font-mono font-black">B{botSpIdx + 1}</text>
        </g>
      )}
    </g>
  );
});

EditorHexCell.displayName = 'EditorHexCell';

interface EditorGridCellsProps {
  grid: Record<string, CustomHex>;
  playerSpawn: { q: number; r: number };
  botSpawns: Record<number, { q: number; r: number }>;
  botCount: number;
  hexPolPoints: string;
  hexRadius: number;
  handleCellMouseDown: (key: string, e: React.MouseEvent) => void;
  handleCellMouseEnter: (key: string) => void;
  getCellColor: (hex: CustomHex) => string;
}

const EditorGridCells: React.FC<EditorGridCellsProps> = React.memo(({
  grid,
  playerSpawn,
  botSpawns,
  botCount,
  hexPolPoints,
  hexRadius,
  handleCellMouseDown,
  handleCellMouseEnter,
  getCellColor
}) => {
  return (
    <>
      {Object.keys(grid).map(key => {
        const hex = grid[key];
        const cellColor = getCellColor(hex);
        const isPlayerSp = hex.q === playerSpawn.q && hex.r === playerSpawn.r;
        
        let botSpIdx: number | null = null;
        for (let i = 0; i < botCount; i++) {
          const sp = botSpawns[i];
          if (sp && sp.q === hex.q && sp.r === hex.r) {
            botSpIdx = i;
            break;
          }
        }

        return (
          <EditorHexCell
            key={key}
            hex={hex}
            cellColor={cellColor}
            isPlayerSp={isPlayerSp}
            botSpIdx={botSpIdx}
            hexPolPoints={hexPolPoints}
            hexRadius={hexRadius}
            onMouseDown={handleCellMouseDown}
            onMouseEnter={handleCellMouseEnter}
          />
        );
      })}
    </>
  );
});

EditorGridCells.displayName = 'EditorGridCells';

const DEFAULT_ITEMS_LIST = [
  { id: 'fuel_cell', nameEN: 'Spent Fuel Cell', nameRU: 'Отработанный элемент' },
  { id: 'data_disc', nameEN: 'Fragmented Data Disc', nameRU: 'Битый Диск Данных' },
  { id: 'raw_container', nameEN: 'Raw Container', nameRU: 'Грубый Контейнер' },
  { id: 'reality_patch', nameEN: 'Reality Patch', nameRU: 'Лоскут Реальности' },
  { id: 'midas_chip', nameEN: 'Midas Chip', nameRU: 'Чип Мидаса' },
  { id: 'apex_core', nameEN: 'Apex Core', nameRU: 'Ядро Апекс' }
];

const PRESETS = [
  {
    id: 'empty',
    nameEN: 'Flat Arena',
    nameRU: 'Плоская Арена',
    descEN: 'Empty flat arena of 0 level - perfect for designing your own tactics.',
    descRU: 'Пустая плоская равнина 0-го уровня — идеальная стартовая точка.'
  },
  {
    id: 'mountain',
    nameEN: 'Tactical Spires',
    nameRU: 'Тактические Шпили',
    descEN: 'Features high elevated spires and deep valleys around the center.',
    descRU: 'Высокие шспили и провалы вокруг центрального ядра.'
  },
  {
    id: 'shaft_mine',
    nameEN: 'Drill Quarry',
    nameRU: 'Карьер Бурения',
    descEN: 'A deep crater in the center with multiple layers of negative levels for mining.',
    descRU: 'Центральный глубокий кратер с отрицательными уровнями для добычи.'
  },
  {
    id: 'void_bridge',
    nameEN: 'Shattered Islands',
    nameRU: 'Осколочные Мосты',
    descEN: 'Islands divided by void blocks connected with narrow ridges.',
    descRU: 'Разделенные пустотой острова, соединенные узкими переходами.'
  }
];

export const LevelEditorView: React.FC = () => {
  const language = useGameStore(state => state.language);
  const setUIState = useGameStore(state => state.setUIState);
  const startNewGame = useGameStore(state => state.startNewGame);
  const playUiSound = useGameStore(state => state.playUiSound);
  const showToast = useGameStore(state => state.showToast);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // --- EDITOR STATE ---
  const [title, setTitle] = useState(language === 'RU' ? 'Мой сектор аномалии' : 'My Anomaly Sector');
  const [description, setDescription] = useState(language === 'RU' ? 'Созданный вручную тактический сектор с кастомным ландшафтом.' : 'Custom tactical arena built in the level editor.');
  const [goalText, setGoalText] = useState(language === 'RU' ? 'Достигнуть высоты и собрать лимит' : 'Reach heights and claim capital');
  const [mapSize, setMapSize] = useState(5); // base radius
  const [mapType, setMapType] = useState<'fixed' | 'procedural'>('fixed');
  
  // Zoom and Pan state with performance optimized refs
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Starting state
  const [credits, setCredits] = useState(150);
  const [moves, setMoves] = useState(40);
  const [rank, setRank] = useState(1);
  const [materials, setMaterials] = useState(0);
  const [initialEntropy, setInitialEntropy] = useState(100);
  const [startInventory, setStartInventory] = useState<string[]>([]);
  
  // Match configuration
  const [botCount, setBotCount] = useState(2);
  const [botObjective, setBotObjective] = useState<BotObjective>('COMPETE_RANK');
  const aiMode = 'basic';

  // Win condition targets
  const [targetLevel, setTargetLevel] = useState(3);
  const [targetCoins, setTargetCoins] = useState(300);
  const [winType, setWinType] = useState<'SUMMIT' | 'AND' | 'OR'>('SUMMIT');

  // Hex grid storage
  const [grid, setGrid] = useState<Record<string, CustomHex>>({});
  
  // Custom spawn points
  const [playerSpawn, setPlayerSpawn] = useState<{q: number, r: number}>({ q: 0, r: 0 });
  const [botSpawns, setBotSpawns] = useState<Record<number, {q: number, r: number}>>({
    0: { q: -2, r: 4 },
    1: { q: 2, r: -4 },
    2: { q: -4, r: 2 },
    3: { q: 4, r: -2 },
    4: { q: -2, r: -2 },
    5: { q: 2, r: 2 }
  });

  // Brush settings
  const [brushMode, setBrushMode] = useState<'HEIGHT' | 'STRUCTURE' | 'OWNER' | 'SPAWN_PLAYER' | 'SPAWN_BOT' | 'CLEAR'>('HEIGHT');
  const [brushHeight, setBrushHeight] = useState(1);
  const [brushStructure, setBrushStructure] = useState<CustomHex['structureType']>('NONE');
  const [brushOwner, setBrushOwner] = useState<string | null>(null);
  const [selectedBotSpawnIdx, setSelectedBotSpawnIdx] = useState(0);

  // UI state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoveredHex, setHoveredHex] = useState<CustomHex | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // High performance Refs
  const viewGroupRef = useRef<SVGGElement>(null);
  const zoomRef = useRef(1.0);
  const panRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Callback and Drag Optimization Refs
  const gridRef = useRef<Record<string, CustomHex>>({});
  const isMouseDownRef = useRef(false);
  
  // Sync core values to refs on every render phase
  gridRef.current = grid;
  isMouseDownRef.current = isMouseDown;

  const brushSettingsRef = useRef({
    brushMode,
    brushHeight,
    brushStructure,
    brushOwner,
    selectedBotSpawnIdx,
    playerSpawn,
    botSpawns,
    botCount,
    language
  });

  useEffect(() => {
    brushSettingsRef.current = {
      brushMode,
      brushHeight,
      brushStructure,
      brushOwner,
      selectedBotSpawnIdx,
      playerSpawn,
      botSpawns,
      botCount,
      language
    };
  }, [
    brushMode,
    brushHeight,
    brushStructure,
    brushOwner,
    selectedBotSpawnIdx,
    playerSpawn,
    botSpawns,
    botCount,
    language
  ]);

  // Translate helper
  const t = useMemo(() => {
    return {
      title: language === 'RU' ? 'Конструктор Уровней' : 'Level Designer',
      backMenu: language === 'RU' ? 'В Меню' : 'Main Menu',
      metaSection: language === 'RU' ? 'Параметры Сектора' : 'Sector Parameters',
      levelTitle: language === 'RU' ? 'Название уровня' : 'Level Title',
      levelDesc: language === 'RU' ? 'Описание уровня' : 'Level Description',
      levelGoal: language === 'RU' ? 'Краткая задача' : 'Goal Short Text',
      startAssets: language === 'RU' ? 'Стартовые Ресурсы' : 'Starting Assets',
      startingCredits: language === 'RU' ? 'Стартовые Кредиты' : 'Starting Capital',
      startingMoves: language === 'RU' ? 'Запас Ходов' : 'Starting Moves',
      startingRank: language === 'RU' ? 'Векторный Ранг' : 'Engineer Rank',
      startingMaterials: language === 'RU' ? 'Материалы' : 'Materials In Hand',
      startingEntropy: language === 'RU' ? 'Стабильность ядра (%)' : 'Core Entropy (%)',
      startingInv: language === 'RU' ? 'Стартовый инвентарь' : 'Starting Inventory',
      objectives: language === 'RU' ? 'Условия Победы' : 'Victory Objectives',
      winType: language === 'RU' ? 'Логика победы' : 'Victory Criterion',
      targetLevel: language === 'RU' ? 'Целевая Высота' : 'Target Summit Level',
      targetCoins: language === 'RU' ? 'Лимит Кредитов' : 'Target Credit Goal',
      matchSettings: language === 'RU' ? 'Параметры Оппонентов' : 'Rivals & Parameters',
      rivalsCount: language === 'RU' ? 'Количество ИИ-ботов' : 'Rivals count',
      rivalsAim: language === 'RU' ? 'Поведение ИИ-ботов' : 'AI bot objective',
      gridParams: language === 'RU' ? 'Геометрия Поля' : 'Field Geometry',
      gridSize: language === 'RU' ? 'Радиус карты (кольца)' : 'Map Radius (rings)',
      gridType: language === 'RU' ? 'Тип карты' : 'Map generator type',
      fixedMap: language === 'RU' ? 'Фиксированная' : 'Fixed matrix',
      proceduralMap: language === 'RU' ? 'Процедурная' : 'Procedural generator',
      brushPanel: language === 'RU' ? 'Кисть Редактирования' : 'Designer Paintbrush',
      brushHeightOpt: language === 'RU' ? 'Высота' : 'Height level',
      brushStructOpt: language === 'RU' ? 'Строение' : 'Feature / Wall',
      brushOwnerOpt: language === 'RU' ? 'Владелец' : 'Hex Ownership',
      spawnPlayerOpt: language === 'RU' ? 'Старт Игрока' : 'Set Player Spawn',
      spawnBotOpt: language === 'RU' ? 'Старт Ботов' : 'Set Rivals Spawns',
      clearHexOpt: language === 'RU' ? 'Ластик' : 'Eraser tool',
      playtest: language === 'RU' ? 'ИСПЫТАТЬ СЕКТОР' : 'TEST ANOMALY',
      actions: language === 'RU' ? 'Экспорт / Импорт' : 'Code Actions',
      presetsTitle: language === 'RU' ? 'Загрузить Шаблон' : 'Load Layout Template',
      exportJson: language === 'RU' ? 'Экспортировать JSON' : 'Copy/Export JSON',
      importJson: language === 'RU' ? 'Импортировать JSON' : 'Paste/Import JSON',
      downloadFile: language === 'RU' ? 'Скачать файл' : 'Download Level File',
      uploadFile: language === 'RU' ? 'Загрузить файл' : 'Upload Level File',
      confirmClear: language === 'RU' ? 'Сбросить карту к L0?' : 'Reset map layer to L0?',
      invalidJson: language === 'RU' ? 'Ошибка парсинга JSON!' : 'Invalid JSON format! Please check core fields.',
      importSuccess: language === 'RU' ? 'Уровень успешно импортирован!' : 'Custom sector imported successfully!',
      playerSpawnSet: language === 'RU' ? 'Точка старта игрока установлена' : 'Player starting position established'
    };
  }, [language]);

  // Generate initial coordinates based on mapSize
  const generateBlankCoords = (size: number) => {
    const temp: Record<string, CustomHex> = {};
    for (let q = -size; q <= size; q++) {
      const r1 = Math.max(-size, -q - size);
      const r2 = Math.min(size, -q + size);
      for (let r = r1; r <= r2; r++) {
        const key = getHexKey(q, r);
        temp[key] = {
          q,
          r,
          currentLevel: 0,
          maxLevel: 0,
          structureType: 'NONE',
          ownerId: null
        };
      }
    }
    return temp;
  };

  const applyDomTransform = () => {
    if (viewGroupRef.current) {
      viewGroupRef.current.setAttribute(
        'transform',
        `translate(${svgWidth / 2 + panRef.current.x}, ${svgHeight / 2 + panRef.current.y}) scale(${zoomRef.current})`
      );
    }
  };

  const autoFitView = () => {
    const diameter = Math.max(3, mapSize) * 2 * 24 * 0.9;
    const factor = Math.min(2.0, Math.max(0.12, 380 / diameter));
    const finalZoom = parseFloat(factor.toFixed(2));
    zoomRef.current = finalZoom;
    panRef.current = { x: 0, y: 0 };
    setZoom(finalZoom);
    setPan({ x: 0, y: 0 });
    applyDomTransform();
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.id === 'svg-background' || target.tagName === 'svg' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      const newX = e.clientX - panStartRef.current.x;
      const newY = e.clientY - panStartRef.current.y;
      panRef.current = { x: newX, y: newY };
      applyDomTransform();
    }
  };

  const handleSvgMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setPan({ x: panRef.current.x, y: panRef.current.y });
    }
  };

  const handleSvgWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY;
    const zoomFactor = 1.15;
    let newZoom = delta < 0 ? zoomRef.current * zoomFactor : zoomRef.current / zoomFactor;
    newZoom = Math.max(0.08, Math.min(5.0, newZoom));
    zoomRef.current = newZoom;
    setZoom(newZoom);
    applyDomTransform();
  };

  // Build grid of mapSize
  useEffect(() => {
    setGrid(prev => {
      const fresh = generateBlankCoords(mapSize);
      // Migrate existing properties for intersecting coordinates
      Object.keys(prev).forEach(key => {
        if (fresh[key]) {
          fresh[key] = { ...prev[key] };
        }
      });
      return fresh;
    });
    // Trigger viewport auto-fit
    autoFitView();
  }, [mapSize]);

  // Load a coordinate template preset
  const loadPreset = (presetId: string) => {
    playUiSound('CLICK');
    const freshGrid = generateBlankCoords(mapSize);

    if (presetId === 'mountain') {
      // Placing multiple elevated regions and spires
      Object.keys(freshGrid).forEach(key => {
        const hex = freshGrid[key];
        const distToCenter = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(hex.q + hex.r));
        if (distToCenter === 0) {
          hex.currentLevel = 0;
          hex.structureType = 'MONUMENT';
        } else if (distToCenter === 1) {
          hex.currentLevel = 1;
        } else if (distToCenter === 2) {
          hex.currentLevel = 3;
          if (Math.abs(hex.q) === 2 || Math.abs(hex.r) === 2) {
            hex.structureType = 'BARRIER';
          }
        } else if (distToCenter === 3) {
          hex.currentLevel = 2;
        } else if (distToCenter === 4) {
          hex.currentLevel = 4;
        } else {
          hex.currentLevel = 0;
        }
        hex.maxLevel = Math.max(0, hex.currentLevel);
      });
      showToast(language === 'RU' ? 'Шаблон Шпилей установлен' : 'Tactical Spires template loaded', 'success');
    } else if (presetId === 'shaft_mine') {
      // Placing nested mining circles
      Object.keys(freshGrid).forEach(key => {
        const hex = freshGrid[key];
        const distToCenter = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(hex.q + hex.r));
        if (distToCenter === 0) {
          hex.currentLevel = -1;
          hex.structureType = 'MINE';
        } else if (distToCenter <= 2) {
          hex.currentLevel = -3;
        } else if (distToCenter <= 4) {
          hex.currentLevel = -1;
        } else {
          hex.currentLevel = 1;
        }
        hex.maxLevel = Math.max(0, hex.currentLevel);
      });
      showToast(language === 'RU' ? 'Шаблон Карьера запущен' : 'Drill Quarry template loaded', 'success');
    } else if (presetId === 'void_bridge') {
      // Slicing void rivers
      Object.keys(freshGrid).forEach(key => {
        const hex = freshGrid[key];
        const river = hex.q + hex.r * 2;
        if (river === 3 || river === -2) {
          // Check we do not override spawn points
          if (!(hex.q === 0 && hex.r === 0)) {
            hex.structureType = 'VOID';
          }
        } else if (river === 4 || river === -3) {
          hex.currentLevel = -1;
        } else {
          hex.currentLevel = 1;
        }
        hex.maxLevel = Math.max(0, hex.currentLevel);
      });
      showToast(language === 'RU' ? 'Шаблон Островов запущен' : 'Shattered Islands template loaded', 'success');
    } else {
      // Preset of clean flat fields
      Object.keys(freshGrid).forEach(key => {
        freshGrid[key] = {
          q: freshGrid[key].q,
          r: freshGrid[key].r,
          currentLevel: 0,
          maxLevel: 0,
          structureType: 'NONE',
          ownerId: null
        };
      });
      showToast(language === 'RU' ? 'Начальная равнина L0 восстановлена' : 'Blank arena established', 'success');
    }

    setGrid(freshGrid);
  };

  // Convert custom grid coordinates to customLayout format for exports
  const buildFinalizedLevelConfig = (): LevelConfig => {
    // Collect customized layout nodes
    const customLayout: Partial<Hex>[] = [];
    Object.keys(grid).forEach(key => {
      const hex = grid[key];
      
      let ownerToSerial: string | undefined = undefined;
      if (hex.q === playerSpawn.q && hex.r === playerSpawn.r) {
        ownerToSerial = 'player-1';
      } else if (hex.ownerId === 'player') {
        ownerToSerial = 'player-1';
      } else if (hex.ownerId) {
        ownerToSerial = hex.ownerId;
      }

      // Only serialize hexes that differ from standard plane to keep file thin and clean,
      // or export all if 'fixed' is chosen. For fixed maps, exporting all is safer!
      if (
        mapType === 'fixed' || 
        hex.currentLevel !== 0 || 
        hex.structureType !== 'NONE' || 
        ownerToSerial !== undefined
      ) {
        customLayout.push({
          q: hex.q,
          r: hex.r,
          currentLevel: hex.currentLevel,
          maxLevel: hex.maxLevel,
          structureType: hex.structureType,
          ownerId: ownerToSerial,
          durability: hex.currentLevel === 1 ? 6 : undefined
        });
      }
    });

    // Make explicit list of bot spawn positions matching botCount
    const finalBotSpawns: { q: number, r: number }[] = [];
    for (let i = 0; i < botCount; i++) {
      const pt = botSpawns[i] || { q: -mapSize, r: mapSize };
      finalBotSpawns.push({ q: pt.q, r: pt.r });
    }

    // Embed player spawn as custom state injection or hooks
    const preGeneratedLootHexes: { q: number, r: number }[] = [];
    Object.keys(grid).forEach(key => {
      const hex = grid[key];
      if (hex.currentLevel < 0 && Math.random() > 0.4) {
        preGeneratedLootHexes.push({ q: hex.q, r: hex.r });
      }
    });

    return {
      id: 'custom_editor_level',
      title: title.trim() || 'Custom Sector',
      description: description.trim() || 'A manual simulation build of the Sector.',
      mapConfig: {
        size: mapSize,
        type: mapType,
        generateWalls: mapType === 'procedural',
        customLayout
      },
      startState: {
        credits: credits,
        moves: moves,
        rank: rank,
        materials: materials,
        initialEntropy: initialEntropy,
        startInventory: startInventory
      },
      botSpawnPoints: finalBotSpawns,
      botObjective: botObjective,
      goalText: goalText.trim() || 'Fulfill sector matrix goals',
      aiMode: aiMode,
      preGeneratedLootHexes,
      hooks: {}
    };
  };

  // Perform painting on cell interaction
  const applyBrushToHex = useCallback((key: string) => {
    setGrid(prev => {
      const hex = prev[key];
      if (!hex) return prev;

      const {
        brushMode,
        brushHeight,
        brushStructure,
        brushOwner,
        selectedBotSpawnIdx,
        language
      } = brushSettingsRef.current;

      const current = { ...hex };

      if (brushMode === 'HEIGHT') {
        current.currentLevel = brushHeight;
        current.maxLevel = Math.max(0, brushHeight);
      } else if (brushMode === 'STRUCTURE') {
        current.structureType = brushStructure;
        // Adjust level defaults if applying VOID or BARRIER to fit logical layout
        if (brushStructure === 'VOID') {
          current.currentLevel = -10;
        } else if (brushStructure === 'BARRIER') {
          current.currentLevel = Math.max(current.currentLevel, 2);
        } else if (brushStructure === 'MONUMENT') {
          current.currentLevel = Math.max(current.currentLevel, 1);
        }
      } else if (brushMode === 'OWNER') {
        current.ownerId = brushOwner;
      } else if (brushMode === 'SPAWN_PLAYER') {
        setPlayerSpawn({ q: current.q, r: current.r });
        showToast(language === 'RU' ? 'Точка старта игрока установлена' : 'Player starting position established', 'info');
      } else if (brushMode === 'SPAWN_BOT') {
        setBotSpawns(prevSp => ({
          ...prevSp,
          [selectedBotSpawnIdx]: { q: current.q, r: current.r }
        }));
        showToast(language === 'RU' ? `Стартовая точка Бота ${selectedBotSpawnIdx + 1} назначена` : `Bot ${selectedBotSpawnIdx + 1} starting post identified`, 'info');
      } else if (brushMode === 'CLEAR') {
        current.currentLevel = 0;
        current.maxLevel = 0;
        current.structureType = 'NONE';
        current.ownerId = null;
      }

      return { ...prev, [key]: current };
    });
  }, [showToast]);

  const handleCellMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event propagation so we don't start panning!
    setIsMouseDown(true);
    applyBrushToHex(key);
  }, [applyBrushToHex]);

  const handleCellMouseEnter = useCallback((key: string) => {
    setHoveredHex(gridRef.current[key] || null);
    if (isMouseDownRef.current) {
      applyBrushToHex(key);
    }
  }, [applyBrushToHex]);

  const handleMouseUpGlobal = () => {
    setIsMouseDown(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, []);

  // Starting inventory slots management
  const toggleInventoryItem = (itemId: string) => {
    playUiSound('CLICK');
    setStartInventory(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        if (prev.length >= 6) {
          showToast(language === 'RU' ? 'Инвентарь заполнен (макс 6)' : 'Inventory index limit reached (max 6)', 'error');
          return prev;
        }
        return [...prev, itemId];
      }
    });
  };

  // Export JSON string output
  const handleExportJsonClick = () => {
    playUiSound('CLICK');
    const configObj = buildFinalizedLevelConfig();
    
    // We clean functions/hooks for pure text serialization
    const safeConfig = {
      ...configObj,
      hooks: {} // Strip runtime callbacks
    };

    setPastedJson(JSON.stringify(safeConfig, null, 2));
    setShowJsonModal(true);
  };

  // Direct download to disk
  const handleDownloadFileClick = () => {
    playUiSound('CLICK');
    const configObj = buildFinalizedLevelConfig();
    const safeConfig = {
      ...configObj,
      hooks: {}
    };

    const text = JSON.stringify(safeConfig, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${configObj.title.replace(/\s+/g, '_').toLowerCase() || 'custom_sector'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(language === 'RU' ? 'Файл загружен на диск!' : 'Level file downloaded successfully!', 'success');
  };

  // Upload/Import file trigger
  const handleUploadClick = () => {
    playUiSound('CLICK');
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const imported: any = JSON.parse(text);
        loadConfigObject(imported);
      } catch (err) {
        showToast(t.invalidJson, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  // Parse pasted configuration
  const handleImportSubmit = () => {
    try {
      const imported: any = JSON.parse(pastedJson);
      loadConfigObject(imported);
      setShowJsonModal(false);
    } catch (err) {
      showToast(t.invalidJson, 'error');
    }
  };

  // Helper to sanitize imports against XSS, injection, Denial of Service (DoS) and infinite loops
  const sanitizeTextInput = (text: any, maxLength: number): string => {
    if (typeof text !== 'string') return '';
    const clean = text.replace(/<\/?[^>]+(>|$)/g, ""); // Strip HTML tags
    return clean.trim().slice(0, maxLength);
  };

  // Hydrate states from object
  const loadConfigObject = (imported: any) => {
    if (!imported || typeof imported !== 'object') {
      showToast(t.invalidJson, 'error');
      return;
    }
    if (!imported.title || !imported.mapConfig || typeof imported.mapConfig !== 'object') {
      showToast(t.invalidJson, 'error');
      return;
    }

    // 1. Sanitize text fields
    const cleanTitle = sanitizeTextInput(imported.title, 100) || 'Custom Sector';
    const cleanDescription = sanitizeTextInput(imported.description, 300);
    const cleanGoalText = sanitizeTextInput(imported.goalText, 300);

    setTitle(cleanTitle);
    setDescription(cleanDescription);
    setGoalText(cleanGoalText);
    
    // 2. Validate map layout fields
    const cleanSize = typeof imported.mapConfig.size === 'number' && !isNaN(imported.mapConfig.size) 
      ? Math.max(3, Math.min(25, Math.floor(imported.mapConfig.size))) 
      : 5;
    
    setMapSize(cleanSize);
    
    const validMapTypes = ['fixed', 'procedural'];
    const cleanMapType = typeof imported.mapConfig.type === 'string' && validMapTypes.includes(imported.mapConfig.type) ? imported.mapConfig.type : 'fixed';
    setMapType(cleanMapType);

    // 3. Validate initial statistics and levels
    if (imported.startState && typeof imported.startState === 'object') {
      const cleanCredits = typeof imported.startState.credits === 'number' && !isNaN(imported.startState.credits)
        ? Math.max(0, Math.min(1000000, Math.floor(imported.startState.credits)))
        : 150;
      const cleanMoves = typeof imported.startState.moves === 'number' && !isNaN(imported.startState.moves)
        ? Math.max(0, Math.min(10000, Math.floor(imported.startState.moves)))
        : 40;
      const cleanRank = typeof imported.startState.rank === 'number' && !isNaN(imported.startState.rank)
        ? Math.max(1, Math.min(10, Math.floor(imported.startState.rank)))
        : 1;
      const cleanMaterials = typeof imported.startState.materials === 'number' && !isNaN(imported.startState.materials)
        ? Math.max(0, Math.min(10000, Math.floor(imported.startState.materials)))
        : 0;
      const cleanEntropy = typeof imported.startState.initialEntropy === 'number' && !isNaN(imported.startState.initialEntropy)
        ? Math.max(0, Math.min(100, Math.floor(imported.startState.initialEntropy)))
        : 100;
      
      setCredits(cleanCredits);
      setMoves(cleanMoves);
      setRank(cleanRank);
      setMaterials(cleanMaterials);
      setInitialEntropy(cleanEntropy);

      // Inventory sanitization to ensure values are safe
      const cleanInventory = Array.isArray(imported.startState.startInventory)
        ? imported.startState.startInventory.filter((item: any) => typeof item === 'string' && item.length < 50)
        : [];
      setStartInventory(cleanInventory);
    } else {
      setCredits(150);
      setMoves(40);
      setRank(1);
      setMaterials(0);
      setInitialEntropy(100);
      setStartInventory([]);
    }

    // 4. Validate bot stats
    const rawBotCount = imported.botSpawnPoints?.length ?? imported.winCondition?.botCount ?? 0;
    const cleanBotCount = typeof rawBotCount === 'number' && !isNaN(rawBotCount)
      ? Math.max(0, Math.min(4, Math.floor(rawBotCount)))
      : 0;
    setBotCount(cleanBotCount);

    const validObjectives = ['ROAM_MINING', 'DESTROY_MONUMENTS', 'HUNT_PLAYER', 'STAY_DEFENSIVE'];
    const cleanObjective = typeof imported.botObjective === 'string' && validObjectives.includes(imported.botObjective) ? imported.botObjective : 'ROAM_MINING';
    setBotObjective(cleanObjective);

    // 5. Generate safe grid using cleanSize
    const freshGrid = generateBlankCoords(cleanSize);

    // 6. Populate custom layout safely
    if (Array.isArray(imported.mapConfig.customLayout)) {
      // Limit custom layout processing to avoid CPU lock
      const safeLayout = imported.mapConfig.customLayout.slice(0, 2000);
      
      safeLayout.forEach((hexDef: any) => {
        if (!hexDef || typeof hexDef !== 'object') return;
        
        const q = typeof hexDef.q === 'number' && !isNaN(hexDef.q) ? Math.floor(hexDef.q) : 0;
        const r = typeof hexDef.r === 'number' && !isNaN(hexDef.r) ? Math.floor(hexDef.r) : 0;
        
        // Ensure within coordinate bounds of the current cleanSize radius to prevent layout corruption
        if (Math.abs(q) <= cleanSize && Math.abs(r) <= cleanSize && Math.abs(q + r) <= cleanSize) {
          const key = getHexKey(q, r);
          if (freshGrid[key]) {
            const currentLevel = typeof hexDef.currentLevel === 'number' && !isNaN(hexDef.currentLevel)
              ? Math.max(-10, Math.min(10, Math.floor(hexDef.currentLevel)))
              : 0;
            const maxLevel = typeof hexDef.maxLevel === 'number' && !isNaN(hexDef.maxLevel)
              ? Math.max(0, Math.min(10, Math.floor(hexDef.maxLevel)))
              : Math.max(0, currentLevel);
            
            const validStructures = ['NONE', 'BARRIER', 'VOID', 'MONUMENT', 'MINE', 'MINI_MONUMENT'];
            const structureType = typeof hexDef.structureType === 'string' && validStructures.includes(hexDef.structureType) ? hexDef.structureType : 'NONE';
            
            const ownerId = typeof hexDef.ownerId === 'string' && hexDef.ownerId.length < 50 ? hexDef.ownerId : null;

            freshGrid[key] = {
              q,
              r,
              currentLevel,
              maxLevel,
              structureType,
              ownerId
            };
          }
        }
      });
    }
    setGrid(freshGrid);

    // 7. Map bot spawns safely
    const sps: Record<number, {q: number, r: number}> = {};
    if (Array.isArray(imported.botSpawnPoints)) {
      imported.botSpawnPoints.slice(0, cleanBotCount).forEach((pt: any, i: number) => {
        if (pt && typeof pt === 'object') {
          const botQ = typeof pt.q === 'number' && !isNaN(pt.q) ? Math.floor(pt.q) : 0;
          const botR = typeof pt.r === 'number' && !isNaN(pt.r) ? Math.floor(pt.r) : 0;
          
          // Clamp inside board bounds
          const boundedQ = Math.max(-cleanSize, Math.min(cleanSize, botQ));
          const boundedR = Math.max(-cleanSize, Math.min(cleanSize, botR));
          
          sps[i] = { q: boundedQ, r: boundedR };
        } else {
          sps[i] = { q: -cleanSize, r: cleanSize };
        }
      });
    } else {
      // Create defaults
      for (let i = 0; i < cleanBotCount; i++) {
        sps[i] = { q: -cleanSize, r: cleanSize };
      }
    }
    setBotSpawns(sps);

    showToast(t.importSuccess, 'success');
  };

  // Launch direct gameplay session
  const handlePlaytestClick = () => {
    playUiSound('CLICK');
    const finalConfig = buildFinalizedLevelConfig();

    // Verify player is on a Dry coordinates, not Void
    const pKey = getHexKey(playerSpawn.q, playerSpawn.r);
    const pHex = grid[pKey];
    if (pHex?.structureType === 'VOID') {
      showToast(
        language === 'RU' ? 'Игрок не может стартовать в Пустоте (VOID)!' : 'Player cannot spawn inside VOID blocks!',
        'error'
      );
      return;
    }

    // Establish specific win targets based on editor values
    const winCondition: WinCondition = {
      levelId: -1,
      targetLevel: winType === 'SUMMIT' || winType === 'AND' ? targetLevel : 99,
      targetCoins: winType === 'AND' || winType === 'OR' ? targetCoins : 9999,
      label: finalConfig.title,
      botCount: botCount,
      difficulty: 'MEDIUM',
      queueSize: 2,
      winType: winType,
      initialStorage: 4,
      mapType: 'FLAT'
    };

    // Load custom level
    startNewGame(winCondition, finalConfig);
  };

  // Coordinates formatting
  const getCellColor = useCallback((hex: CustomHex) => {
    if (hex.structureType === 'VOID') return '#020617'; // absolute pitch-black void holes
    if (hex.structureType === 'BARRIER') return '#475569'; // steel walls
    
    // Check if spawn point overlay
    if (hex.q === playerSpawn.q && hex.r === playerSpawn.r) return '#3b82f6'; // Bright Cyber Blue

    // Check if bot spawn overlay
    for (let i = 0; i < botCount; i++) {
      const sp = botSpawns[i];
      if (sp && sp.q === hex.q && sp.r === hex.r) return '#f43f5e'; // Bright Rose Bot point
    }

    const lvl = hex.currentLevel;
    if (lvl < 0) {
      // Blues and deep purples
      const intensity = Math.min(5, Math.abs(lvl) - 1);
      const colors = ['#1e1b4b', '#2e1065', '#3b0764', '#4c1d95', '#581c87', '#6b21a8'];
      return colors[intensity];
    } else if (lvl === 0) {
      return '#0f172a'; // Neutral dark slate
    } else if (lvl === 1) {
      return '#1e293b'; // Cracked earth
    } else {
      // Hues of gold and warm vectors for mountains
      const intensity = Math.min(8, lvl - 2);
      const colors = ['#0f766e', '#0d9488', '#0284c7', '#0369a1', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];
      return colors[intensity] || '#451a03';
    }
  }, [playerSpawn, botSpawns, botCount]);

  // Grid SVG visual elements
  const svgWidth = 620;
  const svgHeight = 440;
  const hexRadius = 24;

  const hexPolPoints = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i + 30);
      const vx = hexRadius * Math.cos(angle);
      const vy = hexRadius * Math.sin(angle) * 0.8; // Apply 0.8 perspective squash
      points.push(`${vx},${vy}`);
    }
    return points.join(' ');
  }, [hexRadius]);

  return (
    <div className="w-full h-full text-slate-100 flex flex-col relative bg-slate-950 font-sans max-h-screen overflow-hidden">
      
      {/* HEADER SECTION */}
      <header className="px-6 py-4 bg-slate-900/80 border-b border-indigo-500/20 flex items-center justify-between shrink-0 relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { playUiSound('CLICK'); setIsExitDialogOpen(true); }}
            className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-950/60 hover:text-white hover:bg-slate-800 hover:border-slate-500 transition-all flex items-center gap-2 text-xs font-mono"
          >
            <ChevronLeft className="w-4 h-4" /> {t.backMenu}
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" /> {t.title}
            </h1>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest leading-none mt-1 uppercase">
              GRID ARCHITECTURE COMPOSER V2.5
            </span>
          </div>
        </div>

        {/* TOP QUICK PRESETS */}
        <div className="hidden lg:flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
          <span className="text-[10px] px-2 text-slate-500 font-bold uppercase tracking-wider">{t.presetsTitle}:</span>
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => loadPreset(p.id)}
              className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-bold font-mono border border-transparent hover:border-slate-700"
              title={language === 'RU' ? p.descRU : p.descEN}
            >
              {language === 'RU' ? p.nameRU : p.nameEN}
            </button>
          ))}
        </div>

        {/* PLAYTEST BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJsonClick}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-950 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-bold rounded-xl uppercase tracking-wider hover:border-indigo-400 hover:text-white transition-all"
            title="Export config code"
          >
            <Copy className="w-4 h-4" /> Code
          </button>
          <button 
            onClick={handlePlaytestClick}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl border-t border-indigo-400/50 shadow-[0_4px_20px_rgba(99,102,241,0.45)] transition-all flex items-center gap-2.5 group"
          >
            <Play className="w-4 h-4 text-indigo-100 group-hover:scale-110 transition-transform duration-300 fill-current" />
            {t.playtest}
          </button>
        </div>
      </header>

      {/* THREE-COLUMN LAYOUT BODY */}
      <main className="flex-1 w-full overflow-hidden flex flex-col md:flex-row bg-slate-950/40 relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json,.txt" 
          className="hidden" 
        />

        {/* LEFT COLUMN: METADATA & CONFIGURATION PANEL */}
        <aside className="w-full md:w-80 border-r border-slate-900 bg-slate-950/80 p-5 overflow-y-auto no-scrollbar space-y-5 flex-shrink-0">
          
          {/* SECTION 1: MAP INFO */}
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-1.5">
              <Sparkles className="w-4 h-4" /> {t.metaSection}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1 font-mono">{t.levelTitle}</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all text-white placeholder-slate-700"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1 font-mono">{t.levelDesc}</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all text-white placeholder-slate-700 resize-none h-14"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1 font-mono">{t.levelGoal}</label>
                <input 
                  type="text" 
                  value={goalText} 
                  maxLength={35}
                  onChange={e => setGoalText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black uppercase focus:border-indigo-500 focus:outline-none transition-all text-amber-400 placeholder-slate-700 font-mono tracking-wide"
                  placeholder="Reach height L4 and accumulate 500 Credits"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: MAP GEOMETRY */}
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-1.5">
              <MapIcon className="w-4 h-4" /> {t.gridParams}
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 font-mono mb-1.5">
                  <span>{t.gridSize}</span>
                  <span className="text-cyan-400">{mapSize}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setMapSize(s => Math.max(3, s - 1))}
                    disabled={mapSize <= 3}
                    className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-500 flex items-center justify-center text-slate-400 disabled:opacity-20 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input 
                    type="range" 
                    min={3} 
                    max={25} 
                    value={mapSize} 
                    onChange={e => setMapSize(parseInt(e.target.value))}
                    className="flex-1 accent-cyan-500 cursor-pointer h-1"
                  />
                  <button 
                    onClick={() => setMapSize(s => Math.min(25, s + 1))}
                    disabled={mapSize >= 25}
                    className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-500 flex items-center justify-center text-slate-400 disabled:opacity-20 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1.5 font-mono">{t.gridType}</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono">
                  <button 
                    onClick={() => setMapType('fixed')}
                    className={`py-1.5 text-[9px] font-black uppercase rounded-lg tracking-wider transition-all ${mapType === 'fixed' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {t.fixedMap}
                  </button>
                  <button 
                    onClick={() => setMapType('procedural')}
                    className={`py-1.5 text-[9px] font-black uppercase rounded-lg tracking-wider transition-all ${mapType === 'procedural' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {t.proceduralMap}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PLAYER ASSETS */}
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-1.5">
              <Activity className="w-4 h-4" /> {t.startAssets}
            </h2>
            <div className="space-y-3 font-mono text-[10px]">
              {/* Credits counter */}
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                <span className="text-slate-400 font-medium">{t.startingCredits}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCredits(c => Math.max(0, c - 25))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <span className="font-bold text-amber-500 w-10 text-right">{credits}</span>
                  <button onClick={() => setCredits(c => Math.min(2000, c + 25))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Moves counter */}
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                <span className="text-slate-400 font-medium">{t.startingMoves}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMoves(m => Math.max(5, m - 5))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <span className="font-bold text-sky-500 w-10 text-right">{moves}</span>
                  <button onClick={() => setMoves(m => Math.min(250, m + 5))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Engineering rank */}
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                <span className="text-slate-400 font-medium">{t.startingRank}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRank(r => Math.max(1, r - 1))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <span className="font-bold text-fuchsia-400 w-10 text-right">{rank}</span>
                  <button onClick={() => setRank(r => Math.min(10, r + 1))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Materials */}
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                <span className="text-slate-400 font-medium">{t.startingMaterials}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMaterials(m => Math.max(0, m - 1))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <span className="font-bold text-indigo-400 w-10 text-right">{materials}</span>
                  <button onClick={() => setMaterials(m => Math.min(6, m + 1))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Core stability */}
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                <span className="text-slate-400 font-medium">{t.startingEntropy}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setInitialEntropy(e => Math.max(30, e - 10))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <span className="font-bold text-red-400 w-10 text-right">{initialEntropy}%</span>
                  <button onClick={() => setInitialEntropy(e => Math.min(100, e + 10))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          </div>

        </aside>

        {/* CENTER COLUMN: INTERACTIVE DRAWING HEX BOARD */}
        <section className="flex-1 flex flex-col relative bg-slate-950 border-r border-slate-900">
          
          {/* TOOLBAR LEGEND / ACTIVE BRUSH PICKER */}
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <Hammer className="w-3.5 h-3.5" /> {t.brushPanel}:
              </span>
              <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 gap-0.5 font-mono text-[10px]">
                <button
                  onClick={() => setBrushMode('HEIGHT')}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold transition-all ${brushMode === 'HEIGHT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.brushHeightOpt}
                </button>
                <button
                  onClick={() => setBrushMode('STRUCTURE')}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold transition-all ${brushMode === 'STRUCTURE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.brushStructOpt}
                </button>
                <button
                  onClick={() => setBrushMode('OWNER')}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold transition-all ${brushMode === 'OWNER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.brushOwnerOpt}
                </button>
                <button
                  onClick={() => setBrushMode('SPAWN_PLAYER')}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold transition-all ${brushMode === 'SPAWN_PLAYER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.spawnPlayerOpt}
                </button>
                <button
                  onClick={() => setBrushMode('SPAWN_BOT')}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold transition-all ${brushMode === 'SPAWN_BOT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.spawnBotOpt}
                </button>
                <button
                  onClick={() => setBrushMode('CLEAR')}
                  className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold transition-all ${brushMode === 'CLEAR' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t.clearHexOpt}
                </button>
              </div>
            </div>

            {/* EXPANDED SENSITIVE CONTROLS PER ACTIVE BRUSH */}
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {brushMode === 'HEIGHT' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs"
                  >
                    <span className="text-[10px] text-slate-500 font-mono">VAL:</span>
                    <button 
                      onClick={() => setBrushHeight(h => Math.max(-5, h - 1))}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`font-mono font-black w-8 text-center ${brushHeight < 0 ? 'text-sky-400' : brushHeight > 0 ? 'text-amber-500 font-black' : 'text-slate-300'}`}>
                      L{brushHeight}
                    </span>
                    <button 
                      onClick={() => setBrushHeight(h => Math.min(10, h + 1))}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}

                {brushMode === 'STRUCTURE' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5"
                  >
                    {(['NONE', 'VOID', 'BARRIER', 'MONUMENT', 'MINE', 'MINI_MONUMENT'] as CustomHex['structureType'][]).map(st => (
                      <button
                        key={st}
                        onClick={() => setBrushStructure(st)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-black transition-all uppercase ${brushStructure === st ? 'bg-slate-800 text-white border border-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {st}
                      </button>
                    ))}
                  </motion.div>
                )}

                {brushMode === 'OWNER' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5"
                  >
                    <button
                      onClick={() => setBrushOwner(null)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-mono transition-all font-black uppercase ${brushOwner === null ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Neutral
                    </button>
                    <button
                      onClick={() => setBrushOwner('player')}
                      className={`px-3 py-1 rounded-lg text-[9px] font-mono transition-all font-black uppercase ${brushOwner === 'player' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Player
                    </button>
                    {Array.from({ length: botCount }).map((_, i) => {
                      const id = `bot_${i}`;
                      return (
                        <button
                          key={id}
                          onClick={() => setBrushOwner(id)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-mono transition-all font-black uppercase ${brushOwner === id ? 'bg-rose-600/30 text-rose-300' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Bot {i + 1}
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {brushMode === 'SPAWN_BOT' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5"
                  >
                    <span className="text-[9px] px-2 text-slate-500 uppercase font-mono font-bold">Select rival:</span>
                    {Array.from({ length: botCount }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedBotSpawnIdx(i)}
                        className={`w-6 h-6 rounded-lg text-[10px] font-mono font-black transition-all ${selectedBotSpawnIdx === i ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MAIN GRAPHIC CANVAS INTERACTIVE AREA */}
          <div className="flex-1 w-full bg-slate-950 flex items-center justify-center relative select-none overflow-hidden">
            
            {/* Ambient Background Grid pattern */}
            <div className="absolute inset-0 bg-cyber-grid opacity-15 pointer-events-none" />

            {/* FLOATING ZOOM & VIEW CONTROLS */}
            <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-850 rounded-xl p-1.5 flex items-center gap-1.5 z-20 shadow-2xl backdrop-blur-md">
              <button
                onClick={() => {
                  playUiSound('CLICK');
                  const targetZ = Math.min(5.0, zoomRef.current * 1.25);
                  zoomRef.current = targetZ;
                  setZoom(targetZ);
                  applyDomTransform();
                }}
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-500 hover:text-white text-slate-400 flex items-center justify-center transition-all hover:bg-slate-850 active:scale-95"
                title={language === 'RU' ? 'Приблизить' : 'Zoom In'}
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="px-1 text-[10px] font-mono font-black text-indigo-400 min-w-[50px] text-center select-none leading-none">
                {Math.round(zoom * 100)}%
                <span className="hidden">Offset: {pan.x}, {pan.y}</span>
              </div>
              <button
                onClick={() => {
                  playUiSound('CLICK');
                  const targetZ = Math.max(0.1, zoomRef.current / 1.25);
                  zoomRef.current = targetZ;
                  setZoom(targetZ);
                  applyDomTransform();
                }}
                className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-500 hover:text-white text-slate-400 flex items-center justify-center transition-all hover:bg-slate-850 active:scale-95"
                title={language === 'RU' ? 'Отдалить' : 'Zoom Out'}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-800" />
              <button
                onClick={() => {
                  playUiSound('CLICK');
                  zoomRef.current = 1.0;
                  panRef.current = { x: 0, y: 0 };
                  setZoom(1.0);
                  setPan({ x: 0, y: 0 });
                  applyDomTransform();
                }}
                className="px-2.5 h-8 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-500 hover:text-white text-slate-400 flex items-center justify-center text-[10px] font-mono tracking-wider transition-all hover:bg-slate-850 active:scale-95 cursor-pointer uppercase font-bold"
                title={language === 'RU' ? 'Сбросить зум' : 'Reset view to 100%'}
              >
                100%
              </button>
              <button
                onClick={() => { playUiSound('CLICK'); autoFitView(); }}
                className="px-2.5 h-8 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono tracking-wider transition-all active:scale-95 cursor-pointer uppercase font-bold"
                title={language === 'RU' ? 'Показать всё' : 'Auto-Fit Grid'}
              >
                Fit
              </button>
            </div>

            <div className="block relative">
              <svg 
                width={svgWidth} 
                height={svgHeight} 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className={`overflow-hidden drop-shadow-2xl ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
                onWheel={handleSvgWheel}
                style={{ background: 'transparent' }}
              >
                {/* SVG Patcher Background */}
                <rect 
                  id="svg-background"
                  width={svgWidth} 
                  height={svgHeight} 
                  fill="transparent" 
                />

                {/* Transformed view group wrapper */}
                <g ref={viewGroupRef} transform={`translate(${svgWidth / 2 + panRef.current.x}, ${svgHeight / 2 + panRef.current.y}) scale(${zoomRef.current})`}>
                  <EditorGridCells
                    grid={grid}
                    playerSpawn={playerSpawn}
                    botSpawns={botSpawns}
                    botCount={botCount}
                    hexPolPoints={hexPolPoints}
                    hexRadius={hexRadius}
                    handleCellMouseDown={handleCellMouseDown}
                    handleCellMouseEnter={handleCellMouseEnter}
                    getCellColor={getCellColor}
                  />
                </g>
              </svg>
            </div>

            {/* FLOATING HOVERED LEVEL DETAILS HUD */}
            {hoveredHex && (
              <div className="absolute bottom-5 left-5 bg-slate-900/95 border border-indigo-500/20 rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-[11px] font-mono pointer-events-none group animate-fade-in z-20">
                <span className="text-indigo-400 font-black flex items-center gap-1 leading-none uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5" /> Hex Coordinate
                </span>
                <div className="h-px bg-slate-800 my-1 w-full" />
                <span className="text-slate-400">Axes: <span className="text-slate-100 font-bold">q: {hoveredHex.q}, r: {hoveredHex.r}</span></span>
                <span className="text-slate-400">Height: <span className={`font-bold ${hoveredHex.currentLevel < 0 ? 'text-sky-400' : 'text-amber-400'}`}>L{hoveredHex.currentLevel} (max: {hoveredHex.maxLevel})</span></span>
                <span className="text-slate-400">Feature: <span className="text-slate-100 font-bold">{hoveredHex.structureType}</span></span>
                <span className="text-slate-400">Ownership: <span className="text-slate-100 font-bold">{hoveredHex.ownerId ? (hoveredHex.ownerId === 'player' ? 'Player Initial' : `Bot ${parseInt(hoveredHex.ownerId.split('_')[1]) + 1}`) : 'Neutral'}</span></span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: WIN OBJECTIVES & EXPORT PANEL */}
        <aside className="w-full md:w-80 border-l border-slate-900 bg-slate-950/80 p-5 overflow-y-auto no-scrollbar space-y-5 flex-shrink-0">
          
          {/* SECTION 4: WIN CONDITIONS */}
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400 flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-1.5">
              <Shield className="w-4 h-4" /> {t.objectives}
            </h2>
            <div className="space-y-3 font-mono text-[10px]">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1 font-mono">{t.winType}</label>
                <div className="grid grid-cols-3 gap-0.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800 font-mono text-[9px]">
                  {['SUMMIT', 'AND', 'OR'].map(w => (
                    <button
                      key={w}
                      onClick={() => setWinType(w as any)}
                      className={`py-1 rounded-md font-black uppercase transition-all ${winType === w ? 'bg-slate-800 text-amber-400' : 'text-slate-500'}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target height */}
              {(winType === 'SUMMIT' || winType === 'AND') && (
                <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-medium">{t.targetLevel}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTargetLevel(l => Math.max(1, l - 1))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <span className="font-bold text-amber-400 w-10 text-right">L{targetLevel}</span>
                    <button onClick={() => setTargetLevel(l => Math.min(15, l + 1))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              )}

              {/* Target credits */}
              {(winType === 'AND' || winType === 'OR') && (
                <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 font-medium">{t.targetCoins}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTargetCoins(c => Math.max(50, c - 50))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <span className="font-bold text-emerald-400 w-10 text-right">{targetCoins}</span>
                    <button onClick={() => setTargetCoins(c => Math.min(5000, c + 50))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: RIVALS & AI PARAMETERS */}
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-rose-400 flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-1.5">
              <Bot className="w-4 h-4 animate-pulse" /> {t.matchSettings}
            </h2>
            <div className="space-y-3 font-mono text-[10px]">
              {/* Bot count */}
              <div className="flex justify-between items-center bg-slate-950/50 p-2.5 rounded-xl border border-slate-900">
                <span className="text-slate-400 font-medium">{t.rivalsCount}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBotCount(b => Math.max(0, b - 1))} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <span className="font-bold text-rose-400 w-10 text-right">{botCount} / 6</span>
                  <button onClick={() => setBotCount(b => Math.min(6, b + 1))} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Bot Strategy objective */}
              {botCount > 0 && (
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1.5 font-mono">{t.rivalsAim}</label>
                  <select
                    value={botObjective}
                    onChange={e => setBotObjective(e.target.value as BotObjective)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-none transition-all text-slate-300 font-mono cursor-pointer"
                  >
                    <option value="ROAM_MINING">ROAM_MINING (Rivalry Mining)</option>
                    <option value="DESTROY_PLAYER">DESTROY_PLAYER (Subversive Sapper)</option>
                    <option value="MONUMENT_RACE">MONUMENT_RACE (Historical Race)</option>
                    <option value="GUARD_HEXES">GUARD_HEXES (Ecology Defense)</option>
                    <option value="OWN_HEXES">OWN_HEXES (Land Claiming)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: INVENTORY DECK SECTOR */}
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-sky-400 flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-1.5">
              <Layers className="w-4 h-4" /> {t.startingInv}
            </h2>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
              {DEFAULT_ITEMS_LIST.map(item => {
                const active = startInventory.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleInventoryItem(item.id)}
                    className={`p-2 rounded-xl border flex flex-col justify-between text-left transition-all h-14 ${active ? 'border-sky-500/50 bg-sky-950/20 text-sky-200' : 'border-slate-850 hover:border-slate-700 hover:bg-slate-900/40 text-slate-500'}`}
                  >
                    <span className="font-bold block tracking-wider uppercase leading-none limit-text">
                      {language === 'RU' ? item.nameRU : item.nameEN}
                    </span>
                    <span className="text-[7.5px] uppercase font-bold text-slate-600 block text-right">
                      {active ? 'Armed' : 'None'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EXPORTS RAW ACTION CARDS */}
          <div className="pt-2.5 flex flex-col gap-2">
            <button
              onClick={handleDownloadFileClick}
              className="w-full py-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold font-mono text-xs uppercase tracking-widest rounded-xl hover:border-slate-600 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> {t.downloadFile}
            </button>
            <button
              onClick={handleUploadClick}
              className="w-full py-3 bg-slate-900/30 hover:bg-slate-900/60 border border-dashed border-slate-800 text-slate-500 hover:text-slate-300 font-bold font-mono text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> {t.uploadFile}
            </button>
          </div>

        </aside>

      </main>

      {/* FOOTER INFORMANT */}
      <footer className="px-6 py-2 bg-slate-950 border-t border-slate-900 flex justify-between shrink-0 text-[10px] font-mono text-slate-500 relative z-10">
        <span>BOARD METADATA STATUS: ONLINE</span>
        <span>DESIGN LEVEL CODE: {title.replace(/\s+/g, '_').toLowerCase() || 'custom'}</span>
      </footer>

      {/* JSON CODE DIALOG OVERLAY */}
      <AnimatePresence>
        {showJsonModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl w-full max-w-xl h-fit max-h-[85vh] overflow-hidden flex flex-col relative group"
            >
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/50" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-500/50" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-500/50" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/50" />

              <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-500/20 bg-slate-900/50">
                <span className="text-xs font-black uppercase text-indigo-400 font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4" /> {language === 'RU' ? 'Проводник Кода Уровня' : 'Level Configuration Source'}
                </span>
                <button 
                  onClick={() => { playUiSound('CLICK'); setShowJsonModal(false); }}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                  {language === 'RU' 
                    ? 'Скопируйте полученный код для сохранения или вставьте сюда ваш код уровня для импорта в конструктор.' 
                    : 'Copy this JSON structure to export your level or paste a formatted level config string below to load.'}
                </p>
                <textarea
                  value={pastedJson}
                  onChange={e => setPastedJson(e.target.value)}
                  className="w-full text-[10px] font-mono bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 h-80 focus:outline-none focus:border-indigo-500 transition-all text-slate-300 resize-none h-48 scrollbar-thin select-all"
                  spellCheck={false}
                />
              </div>

              <div className="px-6 py-4 bg-slate-900/50 border-t border-indigo-500/20 flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pastedJson);
                    showToast(language === 'RU' ? 'Скопировано в буфер обмена!' : 'Copied to clipboard!', 'success');
                    playUiSound('CLICK');
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 text-indigo-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:text-white hover:border-indigo-500 border border-slate-800 transition-all"
                >
                  {language === 'RU' ? 'Копировать' : 'Copy Code'}
                </button>
                <button
                  onClick={handleImportSubmit}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-900/30 transition-all"
                >
                  {language === 'RU' ? 'Импортировать' : 'Load Configuration'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LevelExitDialog 
        isOpen={isExitDialogOpen}
        onClose={() => setIsExitDialogOpen(false)}
        onConfirm={() => {
          setIsExitDialogOpen(false);
          setUIState('MENU');
        }}
        mode="EDITOR"
        language={language === 'RU' ? 'RU' : 'EN'}
        playUiSound={playUiSound}
      />
    </div>
  );
};

export default LevelEditorView;
