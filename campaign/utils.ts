import { GAME_CONFIG } from '../rules/config';

export const isStranded = (state: any) => {
    return state.player.moves <= 0 && 
           state.player.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && 
           !state.player.recoveredCurrentHex;
};