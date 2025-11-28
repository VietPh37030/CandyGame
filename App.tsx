import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Board, Candy, GameState, LevelConfig, Booster, BoosterType, FloatingText } from './types';
import { 
  BOARD_SIZE, 
  ANIMATION_DELAY, 
  LEVELS 
} from './constants';
import { 
  generateBoard, 
  checkForMatches, 
  isAdjacent, 
  removeMatches, 
  dropAndRefill,
  hasPossibleMoves
} from './utils/gameLogic';
import { playSound } from './utils/audio';
import CandyItem from './components/CandyItem';
import { RefreshCw, Hammer, Bomb, Trophy, RotateCcw, Play } from 'lucide-react';

const App: React.FC = () => {
  const [board, setBoard] = useState<Board>([]);
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [movesLeft, setMovesLeft] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [activeBooster, setActiveBooster] = useState<BoosterType | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [comboShake, setComboShake] = useState(false);
  
  // Use Refs for state that shouldn't trigger immediate re-renders inside timeouts
  const boardRef = useRef<Board>([]);
  
  // Boosters state
  const [boosters, setBoosters] = useState<Booster[]>([
    { type: 'HAMMER', count: 3, icon: <Hammer />, label: 'Smash' },
    { type: 'BOMB', count: 1, icon: <Bomb />, label: 'Bomb' },
    { type: 'SHUFFLE', count: 2, icon: <RefreshCw />, label: 'Shuffle' },
  ]);

  const currentLevelConfig = LEVELS[currentLevelIndex];

  // --- Helper: Visual Effects ---

  const addFloatingText = (text: string, r: number, c: number, className: string = 'text-white', duration: number = 800) => {
    const id = Date.now() + Math.random();
    // Convert grid coordinates to percentage for positioning
    const x = (c / BOARD_SIZE) * 100 + (50 / BOARD_SIZE);
    const y = (r / BOARD_SIZE) * 100 + (50 / BOARD_SIZE);

    setFloatingTexts(prev => [...prev, { id, text, x, y, className }]);

    // Auto remove after animation
    setTimeout(() => {
        setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, duration);
  };

  const triggerComboEffect = () => {
    setComboShake(true);
    setTimeout(() => setComboShake(false), 500);
  };

  // --- Initialization ---

  const startLevel = useCallback((levelIndex: number) => {
    const newBoard = generateBoard();
    setBoard(newBoard);
    boardRef.current = newBoard;
    setScore(0);
    setMovesLeft(LEVELS[levelIndex].moves);
    setGameState(GameState.IDLE);
    setSelectedPos(null);
    setActiveBooster(null);
    setFloatingTexts([]);
    setComboShake(false);
  }, []);

  useEffect(() => {
    startLevel(0);
  }, [startLevel]);

  // --- Game Loop / Logic ---

  const processMatches = useCallback(async (currentBoard: Board, isPlayerMove: boolean, comboMultiplier: number = 1) => {
    setGameState(GameState.PROCESSING);

    // 1. Check for matches
    const { hasMatches, matchedIds } = checkForMatches(currentBoard);

    if (hasMatches) {
      // 2. Animate Matches (Mark them)
      playSound('match', comboMultiplier);
      const matchedBoard = currentBoard.map(row =>
        row.map(candy => (candy && matchedIds.has(candy.id) ? { ...candy, isMatched: true } : candy))
      );
      setBoard(matchedBoard);
      
      // Calculate Score with Combo Multiplier
      const basePoints = matchedIds.size * 10 * (matchedIds.size > 3 ? 1.5 : 1);
      const totalPoints = Math.floor(basePoints * comboMultiplier);
      setScore(prev => prev + totalPoints);

      // Find center of match for floating text
      let centerR = 0, centerC = 0, count = 0;
      currentBoard.forEach((row, r) => {
          row.forEach((candy, c) => {
              if (candy && matchedIds.has(candy.id)) {
                  centerR += r;
                  centerC += c;
                  count++;
              }
          });
      });

      if (count > 0) {
          const r = centerR / count;
          const c = centerC / count;
          
          // Regular score text
          addFloatingText(`+${totalPoints}`, r, c, 'text-white font-bold animate-float', 800);

          // Combo Visuals
          if (comboMultiplier > 1) {
              triggerComboEffect();
              addFloatingText(
                  `Combo x${comboMultiplier}!`, 
                  r - 0.5, 
                  c, 
                  'text-yellow-300 font-black text-2xl md:text-3xl z-20 animate-combo drop-shadow-md stroke-black', 
                  1200
              );
          }
      }

      // Wait for pop animation
      await new Promise(r => setTimeout(r, ANIMATION_DELAY));

      // 3. Remove and Drop
      playSound('pop', comboMultiplier);
      const cleanBoard = removeMatches(matchedBoard, matchedIds);
      const filledBoard = dropAndRefill(cleanBoard);
      
      setBoard(filledBoard);
      
      // Wait for drop animation
      await new Promise(r => setTimeout(r, ANIMATION_DELAY));

      // 4. Recursive check with incremented multiplier
      processMatches(filledBoard, false, comboMultiplier + 1);

    } else {
      // No more matches
      
      // Check for possible moves to prevent soft lock
      if (!hasPossibleMoves(currentBoard)) {
          // Auto shuffle if no moves
          playSound('invalid'); // reuse sound for alert
          addFloatingText("No Moves! Shuffling...", BOARD_SIZE/2, BOARD_SIZE/2, 'text-red-400 font-bold animate-float', 2000);
          const shuffled = generateBoard();
          setBoard(shuffled);
          // Don't recurse immediately, let user play
      }

      // Check Level Win/Loss conditions
      if (score >= currentLevelConfig.targetScore) {
        setGameState(GameState.VICTORY);
        playSound('win');
      } else if (movesLeft <= 0 && isPlayerMove) { // Only check moves if it was a player action ending
        setGameState(GameState.GAME_OVER);
      } else {
        setGameState(GameState.IDLE);
      }
    }
  }, [score, movesLeft, currentLevelConfig.targetScore]);


  // --- User Interactions ---

  const handleBoosterClick = (type: BoosterType) => {
      if (gameState !== GameState.IDLE) return;
      
      const booster = boosters.find(b => b.type === type);
      if (booster && booster.count > 0) {
          if (type === 'SHUFFLE') {
              // Instant effect
              useBooster(type);
              const newBoard = generateBoard();
              setBoard(newBoard);
              playSound('swap');
              addFloatingText("Shuffled!", 3.5, 3.5, 'text-blue-300 font-bold animate-float');
          } else {
              // Target effect (requires clicking candy)
              setActiveBooster(activeBooster === type ? null : type);
          }
      }
  };

  const useBooster = (type: BoosterType) => {
      setBoosters(prev => prev.map(b => b.type === type ? { ...b, count: b.count - 1} : b));
      setActiveBooster(null);
  };

  const handleCandyClick = async (r: number, c: number) => {
    if (gameState !== GameState.IDLE && gameState !== GameState.PROCESSING) return; // Allow clicking while processing? No.
    if (gameState !== GameState.IDLE) return;
    
    // Handle Active Booster Logic
    if (activeBooster) {
        const newBoard = [...board.map(row => [...row])];
        if (activeBooster === 'HAMMER') {
            if (!newBoard[r][c]) return;
            playSound('pop');
            // Remove single
            newBoard[r][c] = { ...newBoard[r][c]!, isMatched: true };
            setBoard(newBoard);
            useBooster('HAMMER');
            setTimeout(async () => {
                const cleaned = removeMatches(newBoard, new Set([newBoard[r][c]!.id]));
                const filled = dropAndRefill(cleaned);
                setBoard(filled);
                processMatches(filled, false);
            }, 300);
            return;
        }
        if (activeBooster === 'BOMB') {
            // Remove 3x3
            const idsToRemove = new Set<string>();
            for(let i = r-1; i <= r+1; i++) {
                for(let j = c-1; j <= c+1; j++) {
                    if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE && newBoard[i][j]) {
                         idsToRemove.add(newBoard[i][j]!.id);
                         newBoard[i][j]!.isMatched = true;
                    }
                }
            }
            setBoard(newBoard);
            playSound('pop');
            useBooster('BOMB');
            setTimeout(() => {
                 const cleaned = removeMatches(newBoard, idsToRemove);
                 const filled = dropAndRefill(cleaned);
                 setBoard(filled);
                 processMatches(filled, false);
            }, 300);
            return;
        }
    }

    // Normal Swap Logic
    if (!selectedPos) {
      setSelectedPos({ r, c });
      playSound('swap');
    } else {
      const { r: r1, c: c1 } = selectedPos;
      setSelectedPos(null);

      // Same candy clicked? Deselect.
      if (r1 === r && c1 === c) return;

      if (isAdjacent(r1, c1, r, c)) {
        // Optimistic Swap
        const newBoard = [...board.map(row => [...row])];
        const temp = newBoard[r][c];
        newBoard[r][c] = newBoard[r1][c1];
        newBoard[r1][c1] = temp;

        setBoard(newBoard);
        setGameState(GameState.SWAPPING);

        // Check if valid
        const { hasMatches } = checkForMatches(newBoard);

        if (hasMatches) {
          setMovesLeft(prev => prev - 1);
          setTimeout(() => processMatches(newBoard, true, 1), 200); // Start chain with combo 1
        } else {
          // Invalid move: swap back
          playSound('invalid');
          setTimeout(() => {
            setBoard(board); // Revert to original board state (captured in closure/ref)
            setGameState(GameState.IDLE);
          }, 300);
        }
      } else {
          playSound('invalid');
      }
    }
  };

  const handleNextLevel = () => {
      if (currentLevelIndex < LEVELS.length - 1) {
          setCurrentLevelIndex(prev => prev + 1);
          startLevel(currentLevelIndex + 1);
      } else {
          // Restart game or show victory screen
          setCurrentLevelIndex(0);
          startLevel(0);
      }
  };

  const handleRetry = () => {
      startLevel(currentLevelIndex);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      
      {/* Header / HUD */}
      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 mb-4 shadow-xl border border-slate-700 text-white">
        <div className="flex justify-between items-center mb-2">
            <div>
                <h1 className="text-xl font-bold text-pink-400">Level {currentLevelConfig.level}</h1>
                <p className="text-xs text-slate-400">{currentLevelConfig.description}</p>
            </div>
            <div className="text-right">
                 <div className="text-2xl font-black font-mono">{score}</div>
                 <div className="text-xs text-slate-400">Target: {currentLevelConfig.targetScore}</div>
            </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (score / currentLevelConfig.targetScore) * 100)}%` }}
            />
        </div>
        
        <div className="mt-2 flex justify-center">
             <div className={`px-4 py-1 rounded-full text-sm font-bold ${movesLeft < 5 ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}>
                 {movesLeft} Moves Left
             </div>
        </div>
      </div>

      {/* Game Board Area */}
      <div className="relative bg-slate-800 p-2 rounded-xl shadow-2xl border-4 border-slate-700 transition-all duration-100">
        <div 
          className={`grid gap-1 bg-slate-900/50 p-1 rounded-lg relative transition-all duration-100 ${comboShake ? 'animate-shake ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)]' : ''}`}
          style={{ 
            gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            width: 'min(90vw, 400px)',
            height: 'min(90vw, 400px)'
          }}
        >
          {board.map((row, r) =>
            row.map((candy, c) => (
              <CandyItem
                key={candy ? candy.id : `empty-${r}-${c}`}
                candy={candy}
                isSelected={selectedPos?.r === r && selectedPos?.c === c}
                onClick={() => handleCandyClick(r, c)}
              />
            ))
          )}

          {/* Floating Combo Text Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-20">
             {floatingTexts.map(ft => (
                 <div 
                    key={ft.id}
                    className={`absolute whitespace-nowrap ${ft.className}`}
                    style={{ 
                        left: `${ft.x}%`, 
                        top: `${ft.y}%`,
                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)'
                    }}
                 >
                     {ft.text}
                 </div>
             ))}
          </div>

        </div>
        
        {/* Game Over / Win Overlays */}
        {gameState === GameState.VICTORY && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl text-center shadow-2xl animate-pop">
                    <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-2" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Level Complete!</h2>
                    <p className="text-slate-500 mb-4">Score: {score}</p>
                    <button 
                        onClick={handleNextLevel}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105"
                    >
                        {currentLevelIndex < LEVELS.length - 1 ? 'Next Level' : 'Play Again'}
                    </button>
                </div>
            </div>
        )}
        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl text-center shadow-2xl animate-pop">
                    <div className="text-4xl mb-2">😢</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Out of Moves!</h2>
                    <p className="text-slate-500 mb-4">Try harder next time.</p>
                    <button 
                        onClick={handleRetry}
                        className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                        <RotateCcw size={18} /> Retry
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Boosters Bar */}
      <div className="mt-6 flex gap-4">
          {boosters.map(b => (
              <button
                key={b.type}
                onClick={() => handleBoosterClick(b.type)}
                disabled={b.count === 0}
                className={`
                    relative flex flex-col items-center justify-center w-16 h-16 rounded-xl border-b-4 transition-all
                    ${activeBooster === b.type ? 'bg-yellow-400 border-yellow-600 -translate-y-2' : 'bg-slate-700 border-slate-900 text-slate-300 hover:bg-slate-600'}
                    ${b.count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                  <div className="w-6 h-6 mb-1">{b.icon}</div>
                  <span className="text-[10px] font-bold uppercase">{b.label}</span>
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                      {b.count}
                  </div>
              </button>
          ))}
      </div>

      {/* Instructions */}
      <div className="mt-8 text-slate-500 text-xs text-center max-w-xs">
          Match 3 candies of the same color to pop them. Use boosters to help clearing the board.
      </div>
    </div>
  );
};

export default App;