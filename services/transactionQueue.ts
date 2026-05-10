
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

  processQueue(
    processor: (actorId: string, action: GameAction) => ValidationResult
  ): ValidationResult[] {
    if (this.processing) {
      return [{ ok: false, reason: 'Queue busy' }];
    }

    this.processing = true;
    const results: ValidationResult[] = [];

    try {
      // Process all currently queued items
      const count = this.queue.length;
      for (let i = 0; i < count; i++) {
        const tx = this.queue.shift();
        if (!tx) break;

        const result = processor(tx.actorId, tx.action);
        results.push(result);
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
