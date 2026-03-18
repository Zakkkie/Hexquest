import React, { useEffect } from 'react';
import { useGameStore } from '../store';

export const OverworldStartQuiz: React.FC = () => {
  const { completeStartQuiz } = useGameStore();

  useEffect(() => {
    // Immediately complete the quiz with no rewards
    completeStartQuiz({ credits: 0, reputation: 0, items: [] });
  }, [completeStartQuiz]);

  return null;
};
