import React, { memo, useState } from 'react';
import { useGameStore } from '../store.ts';
import { BUILDING_DIALOGUE_REGISTRY } from '../rules/buildingDialogues.ts';
import { BuildingDialogueChoice } from '../types.ts';
import { AlertTriangle } from 'lucide-react';

interface BuildingPanelProps {
    buildingType: string;
}

const BuildingPanel: React.FC<BuildingPanelProps> = ({ buildingType }) => {
    const player = useGameStore(state => state.overworld?.player);
    const flags = useGameStore(state => state.overworld.flags);
    const language = useGameStore(state => state.language);
    const exitBuilding = useGameStore(state => state.exitBuilding);
    const resolveBuildingChoice = useGameStore(state => state.resolveBuildingChoice);

    const buildingId = `city_${buildingType}`;
    const dialogue = BUILDING_DIALOGUE_REGISTRY[buildingId];

    const [nodeId, setNodeId] = useState<string>(dialogue?.startNodeId ?? '');

    // Reset dialogue to start when entering a different building
    React.useEffect(() => {
        setNodeId(dialogue?.startNodeId ?? '');
    }, [buildingId]);

    if (!dialogue || !player) return null;

    const node = dialogue.nodes[nodeId];
    if (!node) return null;

    const npcName = node.npcName?.[language];

    const handleChoice = (choice: BuildingDialogueChoice) => {
        if (choice.action === 'CLOSE') {
            exitBuilding();
            return;
        }
        if (choice.action === 'GOTO_NODE' && choice.nextNode) {
            resolveBuildingChoice(choice);
            setNodeId(choice.nextNode);
        }
    };

    const canAffordChoice = (choice: BuildingDialogueChoice): boolean => {
        if (choice.reqCredits && player.credits < choice.reqCredits) return false;
        if (choice.reqItem && !player.bag.includes(choice.reqItem)) return false;
        return true;
    };

    const isFlagBlocked = (choice: BuildingDialogueChoice): boolean => {
        if (choice.reqFlag && !flags[choice.reqFlag]) return true;
        if (choice.reqFlagAbsent && flags[choice.reqFlagAbsent]) return true;
        if (choice.reqRepMin !== undefined && (player.reputation ?? 0) < choice.reqRepMin) return true;
        return false;
    };

    return (
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-700/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md w-full max-w-xs flex flex-col gap-3">
            {/* NPC header */}
            {npcName && (
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                    <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">{npcName}</span>
                </div>
            )}

            {/* Dialogue text */}
            <p className="text-slate-200 text-xs leading-relaxed">
                {node.text[language]}
            </p>

            {/* Choices */}
            <div className="flex flex-col gap-1.5 mt-1">
                {node.choices.map((choice, idx) => {
                    if (isFlagBlocked(choice)) return null;

                    const affordable = canAffordChoice(choice);
                    const creditCost = choice.reqCredits;
                    const hasItem = !choice.reqItem || player.bag.includes(choice.reqItem);

                    return (
                        <button
                            key={idx}
                            onClick={() => handleChoice(choice)}
                            disabled={!affordable}
                            className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-200 text-[11px] font-bold hover:bg-indigo-900/40 hover:border-indigo-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-between gap-2"
                        >
                            <span className="leading-snug">{choice.label[language]}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {creditCost && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${affordable ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                        −{creditCost}cr
                                    </span>
                                )}
                                {choice.reqItem && !hasItem && (
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default memo(BuildingPanel);
