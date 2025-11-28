import React from 'react';

export type CandyColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface Candy {
  id: string;
  color: CandyColor;
  isMatched: boolean;
  isNew: boolean;
}

export type Board = (Candy | null)[][];

export interface LevelConfig {
  level: number;
  targetScore: number;
  moves: number;
  description: string;
}

export enum GameState {
  IDLE,       // Waiting for user input
  SWAPPING,   // Animation of swap
  PROCESSING, // Checking matches, removing, dropping
  GAME_OVER,  // No moves left
  VICTORY     // Target reached
}

export type BoosterType = 'HAMMER' | 'BOMB' | 'SHUFFLE';

export interface Booster {
  type: BoosterType;
  count: number;
  icon: React.ReactNode;
  label: string;
}