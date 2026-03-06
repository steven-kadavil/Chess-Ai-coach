import { Chess, type Move, type Square } from 'chess.js';
import { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'draw' | 'stalemate';

export interface MoveResult {
  san: string;
  from: string;
  to: string;
  fen: string; // FEN after the move — use this to avoid stale closure bugs
  isCapture: boolean;
  capturedPiece: string | undefined;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  moveNumber: number;
  isPlayerMove: boolean;
}

export interface CapturedPieces {
  byWhite: string[]; // pieces the child (White) captured
  byBlack: string[]; // pieces the CPU (Black) captured
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoveSquares, setLegalMoveSquares] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ byWhite: [], byBlack: [] });
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Derived from game state — no extra state needed
  const gameStatus: GameStatus = game.isCheckmate()
    ? 'checkmate'
    : game.isStalemate()
      ? 'stalemate'
      : game.isDraw()
        ? 'draw'
        : game.inCheck()
          ? 'check'
          : 'playing';

  const isGameOver = gameStatus === 'checkmate' || gameStatus === 'draw' || gameStatus === 'stalemate';
  const isPlayerTurn = game.turn() === 'w';

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const selectSquare = useCallback(
    (square: string) => {
      const piece = game.get(square as Square);
      const isWhitePiece = piece?.color === 'w';

      if (isWhitePiece) {
        const moves: Move[] = game.moves({ verbose: true, square: square as Square });
        setSelectedSquare(square);
        setLegalMoveSquares(moves.map((m) => m.to));
      } else {
        setSelectedSquare(null);
        setLegalMoveSquares([]);
      }
    },
    [game],
  );

  const makeMove = useCallback(
    (from: string, to: string, promotion = 'q'): MoveResult | null => {
      const next = new Chess(game.fen());

      let result: ReturnType<typeof next.move>;
      try {
        result = next.move({ from, to, promotion });
      } catch {
        return null; // illegal move
      }

      if (result.captured) {
        const piece = PIECE_NAMES[result.captured] ?? result.captured;
        setCapturedPieces((prev) => ({
          byWhite: result.color === 'w' ? [...prev.byWhite, piece] : prev.byWhite,
          byBlack: result.color === 'b' ? [...prev.byBlack, piece] : prev.byBlack,
        }));
      }

      setGame(next);
      setLastMove({ from, to });
      setSelectedSquare(null);
      setLegalMoveSquares([]);

      return {
        san: result.san,
        from,
        to,
        fen: next.fen(),
        isCapture: !!result.captured,
        capturedPiece: result.captured ? PIECE_NAMES[result.captured] : undefined,
        isCheck: next.inCheck(),
        isCheckmate: next.isCheckmate(),
        isDraw: next.isDraw(),
        moveNumber: Math.ceil(next.history().length / 2),
        isPlayerMove: result.color === 'w',
      };
    },
    [game],
  );

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalMoveSquares([]);
    setCapturedPieces({ byWhite: [], byBlack: [] });
    setLastMove(null);
  }, []);

  return {
    fen: game.fen(),
    gameStatus,
    isGameOver,
    isPlayerTurn,
    selectedSquare,
    legalMoveSquares,
    capturedPieces,
    lastMove,
    selectSquare,
    makeMove,
    resetGame,
  };
}
