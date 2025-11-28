import React from 'react';
import { Candy } from '../types';
import { CANDY_BG_COLORS, CANDY_ICONS } from '../constants';

interface CandyItemProps {
  candy: Candy | null;
  isSelected: boolean;
  onClick: () => void;
}

const CandyItem: React.FC<CandyItemProps> = ({ candy, isSelected, onClick }) => {
  if (!candy) return <div className="w-full h-full" />;

  return (
    <div
      onClick={onClick}
      className={`
        relative w-full h-full p-1 cursor-pointer transition-all duration-200
        ${isSelected ? 'scale-110 z-10 brightness-125' : 'scale-95 hover:scale-105'}
        ${candy.isMatched ? 'animate-pop' : ''}
        ${candy.isNew ? 'animate-drop' : ''}
      `}
    >
      <div
        className={`
          w-full h-full rounded-2xl shadow-inner flex items-center justify-center p-2
          ${CANDY_BG_COLORS[candy.color]}
          border-b-4 border-r-4 border-black/20
          ${isSelected ? 'ring-4 ring-white' : ''}
        `}
      >
        <div className="opacity-90">
            {CANDY_ICONS[candy.color]}
        </div>
        {/* Shine effect */}
        <div className="absolute top-2 left-2 w-3 h-3 bg-white/40 rounded-full" />
      </div>
    </div>
  );
};

export default React.memo(CandyItem);