import { Chessboard } from 'react-chessboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChessBoardProps {
  fen: string;
  selectedSquare: string | null;
  legalMoveSquares: string[];
  lastMove: { from: string; to: string } | null;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  onSquareClick: (square: string) => void;
  onPieceDrop: (from: string, to: string) => void;
}

// ---------------------------------------------------------------------------
// Constants — chess.com-style colors
// ---------------------------------------------------------------------------

const LIGHT_SQUARE = '#EEEED2'; // cream
const DARK_SQUARE = '#769656';  // forest green

const HIGHLIGHT_SELECTED = 'rgba(255, 255, 0, 0.45)';    // yellow
const HIGHLIGHT_LEGAL    = 'rgba(0,   160, 0, 0.35)';    // green
const HIGHLIGHT_LAST     = 'rgba(155, 199, 0, 0.40)';    // yellow-green tint

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildSquareStyles(
  selectedSquare: string | null,
  legalMoveSquares: string[],
  lastMove: { from: string; to: string } | null,
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};

  // Last-move tint (lowest priority — overwritten by selection/legal highlights)
  if (lastMove) {
    styles[lastMove.from] = { backgroundColor: HIGHLIGHT_LAST };
    styles[lastMove.to]   = { backgroundColor: HIGHLIGHT_LAST };
  }

  // Selected piece square
  if (selectedSquare) {
    styles[selectedSquare] = { backgroundColor: HIGHLIGHT_SELECTED };
  }

  // Legal destination squares
  for (const sq of legalMoveSquares) {
    styles[sq] = { backgroundColor: HIGHLIGHT_LEGAL };
  }

  return styles;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Pure presentational chess board — no state, no logic.
 * Wraps react-chessboard with chess.com-style colors and square highlights.
 */
export function ChessBoard({
  fen,
  selectedSquare,
  legalMoveSquares,
  lastMove,
  isPlayerTurn,
  isGameOver,
  onSquareClick,
  onPieceDrop,
}: ChessBoardProps) {
  const squareStyles = buildSquareStyles(selectedSquare, legalMoveSquares, lastMove);

  return (
    <div className="rounded-sm overflow-hidden shadow-2xl"
      style={{ border: '3px solid #404040' }}
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation: 'white',
          lightSquareStyle: { backgroundColor: LIGHT_SQUARE },
          darkSquareStyle:  { backgroundColor: DARK_SQUARE },
          squareStyles,
          showNotation: true,
          animationDurationInMs: 200,
          allowDragging: isPlayerTurn && !isGameOver,
          onSquareClick: ({ square }) => onSquareClick(square),
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            onPieceDrop(sourceSquare, targetSquare);
            return true;
          },
        }}
      />
    </div>
  );
}
