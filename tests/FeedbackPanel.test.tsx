import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FeedbackPanel } from '~/components/chess/FeedbackPanel';
import type { CapturedPieces, GameStatus } from '~/hooks/useChessGame';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_CAPTURED: CapturedPieces = { byWhite: [], byBlack: [] };

function renderPanel(overrides: {
  isPlayerTurn?: boolean;
  isGameOver?: boolean;
  gameStatus?: GameStatus;
  feedback?: string | null;
  capturedPieces?: CapturedPieces;
  onNewGame?: () => void;
  awaitingCpuMove?: boolean;
  onCpuTurn?: () => void;
} = {}) {
  const props = {
    isPlayerTurn: true,
    isGameOver: false,
    gameStatus: 'playing' as GameStatus,
    feedback: 'Great move!',
    capturedPieces: EMPTY_CAPTURED,
    onNewGame: vi.fn(),
    awaitingCpuMove: false,
    onCpuTurn: vi.fn(),
    ...overrides,
  };
  render(<FeedbackPanel {...props} />);
  return props;
}

// ---------------------------------------------------------------------------
// Turn indicator
// ---------------------------------------------------------------------------

describe('turn indicator', () => {
  it('shows "Your turn" when it is the player\'s turn', () => {
    renderPanel({ isPlayerTurn: true });
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });

  it('shows "Computer is thinking" when it is not the player\'s turn', () => {
    renderPanel({ isPlayerTurn: false });
    expect(screen.getByText(/computer is thinking/i)).toBeInTheDocument();
  });

  it('shows the checkmate message when the game is over by checkmate', () => {
    renderPanel({ isGameOver: true, gameStatus: 'checkmate' });
    expect(screen.getByText(/checkmate/i)).toBeInTheDocument();
  });

  it('shows the stalemate message when the game ends in stalemate', () => {
    renderPanel({ isGameOver: true, gameStatus: 'stalemate' });
    expect(screen.getByText(/stalemate/i)).toBeInTheDocument();
  });

  it('shows a draw message when the game ends in a draw', () => {
    renderPanel({ isGameOver: true, gameStatus: 'draw' });
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Coach feedback
// ---------------------------------------------------------------------------

describe('coach feedback', () => {
  it('shows the feedback message when provided', () => {
    renderPanel({ feedback: 'Nice move!' });
    expect(screen.getByText('Nice move!')).toBeInTheDocument();
  });

  it('shows the "Coach is thinking..." pulse when feedback is null', () => {
    renderPanel({ feedback: null });
    expect(screen.getByText(/coach is thinking/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Captured pieces
// ---------------------------------------------------------------------------

describe('captured pieces', () => {
  it('hides the captured pieces section when nothing has been captured', () => {
    renderPanel({ capturedPieces: EMPTY_CAPTURED });
    expect(screen.queryByText(/you got/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/computer got/i)).not.toBeInTheDocument();
  });

  it('shows white\'s captured pieces with correct emoji', () => {
    renderPanel({ capturedPieces: { byWhite: ['pawn', 'knight'], byBlack: [] } });
    expect(screen.getByText(/you got/i)).toBeInTheDocument();
    // ♟ pawn and ♞ knight emojis should appear
    expect(screen.getByText(/♟/)).toBeInTheDocument();
    expect(screen.getByText(/♞/)).toBeInTheDocument();
  });

  it('shows black\'s captured pieces', () => {
    renderPanel({ capturedPieces: { byWhite: [], byBlack: ['rook'] } });
    expect(screen.getByText(/computer got/i)).toBeInTheDocument();
    expect(screen.getByText(/♜/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// New Game button
// ---------------------------------------------------------------------------

describe('new game button', () => {
  it('renders the New Game button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument();
  });

  it('calls onNewGame when the button is clicked', async () => {
    const onNewGame = vi.fn();
    renderPanel({ onNewGame });
    await userEvent.click(screen.getByRole('button', { name: /new game/i }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
