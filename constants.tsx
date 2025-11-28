import { CandyColor, LevelConfig } from './types';
import { Heart, Zap, Star, Hexagon, Circle, Triangle } from 'lucide-react';
import React from 'react';

export const BOARD_SIZE = 8;
export const ANIMATION_DELAY = 300;

export const CANDY_COLORS: CandyColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export const CANDY_ICONS: Record<CandyColor, React.ReactNode> = {
  red: <Heart className="w-full h-full text-white drop-shadow-md" fill="currentColor" />,
  blue: <Zap className="w-full h-full text-white drop-shadow-md" fill="currentColor" />,
  green: <Hexagon className="w-full h-full text-white drop-shadow-md" fill="currentColor" />,
  yellow: <Star className="w-full h-full text-white drop-shadow-md" fill="currentColor" />,
  purple: <Circle className="w-full h-full text-white drop-shadow-md" fill="currentColor" />,
  orange: <Triangle className="w-full h-full text-white drop-shadow-md" fill="currentColor" />,
};

export const CANDY_BG_COLORS: Record<CandyColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
};

export const LEVELS: LevelConfig[] = [
  { level: 1, targetScore: 1000, moves: 15, description: "Score 1000 points" },
  { level: 2, targetScore: 2500, moves: 20, description: "Score 2500 points" },
  { level: 3, targetScore: 5000, moves: 25, description: "Score 5000 points" },
];