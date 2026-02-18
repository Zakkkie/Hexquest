
import { GameAction, ValidationResult } from '../types';

export interface Transaction {
  actorId: string;
  action: GameAction;
  priority: number; // Player = 100, Bot = 50
  timestamp: number;
}

export class TransactionQueue {
  private queue: Transaction[] = [];
  private processing = false;

  enqueue(transaction: Transaction): void {
    this.queue.push(transaction);
    // Sort by priority descending (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  async processQueue(
    processor: (actorId: string, action: GameAction) => ValidationResult
  ): Promise<ValidationResult[]> {
    if (this.processing) {
      return [{ ok: false, reason: 'Queue busy' }];
    }

    this.processing = true;
    const results: ValidationResult[] = [];

    try {
      // Process all currently queued items
      // We take a snapshot of length to avoid infinite loops if processing adds more items immediately (though unlikely here)
      const count = this.queue.length;
      for (let i = 0; i < count; i++) {
        const tx = this.queue.shift();
        if (!tx) break;

        const result = processor(tx.actorId, tx.action);
        results.push(result);
        
        // Micro-yield to main thread to allow UI updates or events to interleave if batch is large
        if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } finally {
      this.processing = false;
    }

    return results;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }
}
