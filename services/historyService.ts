
import { BotLogEntry } from '../types';

class HistoryService {
    private fullBotHistory: BotLogEntry[] = [];
    private readonly MAX_HISTORY_SIZE = 3000;

    public addEntry(entry: BotLogEntry) {
        this.fullBotHistory.push(entry);
        if (this.fullBotHistory.length > this.MAX_HISTORY_SIZE) {
            this.fullBotHistory.splice(0, this.fullBotHistory.length - this.MAX_HISTORY_SIZE);
        }
    }

    public getHistory(): BotLogEntry[] {
        return [...this.fullBotHistory];
    }

    public clear() {
        this.fullBotHistory = [];
    }
}

export const historyService = new HistoryService();
