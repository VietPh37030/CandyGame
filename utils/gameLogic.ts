import { BOARD_SIZE, CANDY_COLORS } from '../constants';
import { Board, Candy } from '../types';

export const createId = () => Math.random().toString(36).substr(2, 9);

export const generateRandomCandy = (): Candy => ({
  id: createId(),
  color: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
  isMatched: false,
  isNew: true,
});

export const generateBoard = (): Board => {
  const board: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: Candy[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      let candy: Candy;
      // Prevent initial matches
      do {
        candy = generateRandomCandy();
      } while (
        (c >= 2 && row[c - 1].color === candy.color && row[c - 2].color === candy.color) ||
        (r >= 2 && board[r - 1][c].color === candy.color && board[r - 2][c].color === candy.color)
      );
      candy.isNew = false; // Initial board isn't "new" for animation
      row.push(candy);
    }
    board.push(row);
  }
  return board;
};

export const checkForMatches = (board: Board): { hasMatches: boolean; matchedIds: Set<string> } => {
  const matchedIds = new Set<string>();
  let hasMatches = false;

  // Horizontal
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE - 2; c++) {
      const candy1 = board[r][c];
      const candy2 = board[r][c + 1];
      const candy3 = board[r][c + 2];

      if (candy1 && candy2 && candy3 && candy1.color === candy2.color && candy1.color === candy3.color) {
        matchedIds.add(candy1.id);
        matchedIds.add(candy2.id);
        matchedIds.add(candy3.id);
        hasMatches = true;
      }
    }
  }

  // Vertical
  for (let r = 0; r < BOARD_SIZE - 2; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const candy1 = board[r][c];
      const candy2 = board[r + 1][c];
      const candy3 = board[r + 2][c];

      if (candy1 && candy2 && candy3 && candy1.color === candy2.color && candy1.color === candy3.color) {
        matchedIds.add(candy1.id);
        matchedIds.add(candy2.id);
        matchedIds.add(candy3.id);
        hasMatches = true;
      }
    }
  }

  return { hasMatches, matchedIds };
};

export const isAdjacent = (r1: number, c1: number, r2: number, c2: number): boolean => {
  return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
};

// Returns a new board with nulls where matches were
export const removeMatches = (board: Board, matchedIds: Set<string>): Board => {
  return board.map(row => 
    row.map(candy => (candy && matchedIds.has(candy.id) ? null : candy))
  );
};

// Drops candies down and fills top with new ones
export const dropAndRefill = (board: Board): Board => {
  const newBoard: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

  for (let c = 0; c < BOARD_SIZE; c++) {
    let emptySlots = 0;
    // Process from bottom up
    for (let r = BOARD_SIZE - 1; r >= 0; r--) {
      if (board[r][c] === null) {
        emptySlots++;
      } else {
        newBoard[r + emptySlots][c] = board[r][c];
        if (newBoard[r + emptySlots][c]) {
             // Reset new flag for existing items moving down
             newBoard[r + emptySlots][c]!.isNew = false; 
        }
      }
    }

    // Fill top empty slots
    for (let r = 0; r < emptySlots; r++) {
      newBoard[r][c] = generateRandomCandy();
    }
  }
  return newBoard;
};

export const hasPossibleMoves = (board: Board): boolean => {
    // Simple heuristic: clone board, try every swap, see if match results.
    // Optimization: Just checking adjacent swaps.
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            // Check right swap
            if (c < BOARD_SIZE - 1) {
                const tempBoard = board.map(row => [...row]);
                // Swap
                const temp = tempBoard[r][c];
                tempBoard[r][c] = tempBoard[r][c+1];
                tempBoard[r][c+1] = temp;
                if (checkForMatches(tempBoard).hasMatches) return true;
            }
            // Check down swap
            if (r < BOARD_SIZE - 1) {
                const tempBoard = board.map(row => [...row]);
                // Swap
                const temp = tempBoard[r][c];
                tempBoard[r][c] = tempBoard[r+1][c];
                tempBoard[r+1][c] = temp;
                if (checkForMatches(tempBoard).hasMatches) return true;
            }
        }
    }
    return false;
};