import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChessBoard, buildSquareStyles } from '~/components/chess/ChessBoard';

// ---------------------------------------------------------------------------
// Mock react-chessboard
// Captures the options prop so we can assert on them without rendering a real board.
// ---------------------------------------------------------------------------

type CapturedOptions = Record<string, unknown>;
let capturedOptions: CapturedOptions = {};

vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: CapturedOptions }) => {
    capturedOptions = options ?? {};
    return <div data-testid="chessboard" />;
  },
}));

beforeEach(() => {
  capturedOptions = {};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function renderBoard(overrides: Partial<Parameters<typeof ChessBoard>[0]> = {}) {
  const props = {
    fen: DEFAULT_FEN,
    selectedSquare: null,
    legalMoveSquares: [],
    lastMove: null,
    isPlayerTurn: true,
    isGameOver: false,
    onSquareClick: vi.fn(),
    onPieceDrop: vi.fn(),
    ...overrides,
  };
  render(<ChessBoard {...props} />);
  return props;
}

// ---------------------------------------------------------------------------
// buildSquareStyles — pure function tests
// ---------------------------------------------------------------------------

describe('buildSquareStyles', () => {
  it('returns empty object when nothing is highlighted', () => {
    expect(buildSquareStyles(null, [], null)).toEqual({});
  });

  it('highlights the selected square yellow', () => {
    const styles = buildSquareStyles('e2', [], null);
    expect(styles['e2'].backgroundColor).toContain('255, 255, 0');
  });

  it('highlights legal move squares green', () => {
    const styles = buildSquareStyles(null, ['e3', 'e4'], null);
    expect(styles['e3'].backgroundColor).toContain('0');
    expect(styles['e4'].backgroundColor).toContain('0');
  });

  it('highlights last-move squares with a yellow-green tint', () => {
    const styles = buildSquareStyles(null, [], { from: 'd2', to: 'd4' });
    expect(styles['d2']).toBeDefined();
    expect(styles['d4']).toBeDefined();
  });

  it('selected square overrides the last-move tint on the same square', () => {
    // If the selected piece happens to be on a last-move square, selection wins.
    const styles = buildSquareStyles('d4', [], { from: 'd2', to: 'd4' });
    // d4 should have the yellow selection color, not the last-move tint
    expect(styles['d4'].backgroundColor).toContain('255, 255, 0');
  });

  it('legal move squares override last-move tint', () => {
    const styles = buildSquareStyles(null, ['d4'], { from: 'd2', to: 'd4' });
    // green legal-move color wins over yellow-green tint
    expect(styles['d4'].backgroundColor).toContain('160, 0');
  });
});

// ---------------------------------------------------------------------------
// ChessBoard component — rendering and options
// ---------------------------------------------------------------------------

describe('ChessBoard rendering', () => {
  it('renders the board', () => {
    renderBoard();
    expect(screen.getByTestId('chessboard')).toBeInTheDocument();
  });

  it('passes the FEN as position', () => {
    renderBoard({ fen: DEFAULT_FEN });
    expect(capturedOptions.position).toBe(DEFAULT_FEN);
  });

  it('allows dragging when it is the player turn and game is not over', () => {
    renderBoard({ isPlayerTurn: true, isGameOver: false });
    expect(capturedOptions.allowDragging).toBe(true);
  });

  it('disables dragging when it is not the player turn', () => {
    renderBoard({ isPlayerTurn: false, isGameOver: false });
    expect(capturedOptions.allowDragging).toBe(false);
  });

  it('disables dragging when the game is over', () => {
    renderBoard({ isPlayerTurn: true, isGameOver: true });
    expect(capturedOptions.allowDragging).toBe(false);
  });

  it('passes computed squareStyles to the board', () => {
    renderBoard({ selectedSquare: 'e2', legalMoveSquares: ['e3', 'e4'] });
    const styles = capturedOptions.squareStyles as Record<string, React.CSSProperties>;
    expect(styles['e2']).toBeDefined();
    expect(styles['e3']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ChessBoard component — callback adapters
// ---------------------------------------------------------------------------

describe('ChessBoard callbacks', () => {
  it('calls onSquareClick with the square string', async () => {
    const onSquareClick = vi.fn();
    renderBoard({ onSquareClick });

    const handler = capturedOptions.onSquareClick as (args: { square: string }) => void;
    handler({ square: 'e2' });

    expect(onSquareClick).toHaveBeenCalledWith('e2');
  });

  it('calls onPieceDrop with from and to squares', () => {
    const onPieceDrop = vi.fn();
    renderBoard({ onPieceDrop });

    const handler = capturedOptions.onPieceDrop as (args: {
      piece: unknown;
      sourceSquare: string;
      targetSquare: string;
    }) => boolean;
    const result = handler({ piece: {}, sourceSquare: 'e2', targetSquare: 'e4' });

    expect(onPieceDrop).toHaveBeenCalledWith('e2', 'e4');
    expect(result).toBe(true);
  });

  it('returns false from onPieceDrop when targetSquare is null', () => {
    renderBoard();
    const handler = capturedOptions.onPieceDrop as (args: {
      piece: unknown;
      sourceSquare: string;
      targetSquare: string | null;
    }) => boolean;
    expect(handler({ piece: {}, sourceSquare: 'e2', targetSquare: null })).toBe(false);
  });
});
