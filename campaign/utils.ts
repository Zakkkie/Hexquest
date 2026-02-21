import { GAME_CONFIG } from '../rules/config';

import { SessionState } from "../types";

export const isStranded = (state: SessionState) => {
    return state.player.moves <= 0 && 
           state.player.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && 
           !state.player.recoveredCurrentHex;
};