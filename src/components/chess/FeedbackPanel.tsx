import type { CapturedPieces, GameStatus } from '~/hooks/useChessGame';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedbackPanelProps {
  isPlayerTurn: boolean;
  isGameOver: boolean;
  gameStatus: GameStatus;
  feedback: string | null; // null = Claude is thinking (show pulse)
  capturedPieces: CapturedPieces;
  awaitingCpuMove: boolean; // true = player has moved, waiting for confirmation
  onCpuTurn: () => void;
  onNewGame: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIECE_EMOJI: Record<string, string> = {
  pawn:   '♟',
  knight: '♞',
  bishop: '♝',
  rook:   '♜',
  queen:  '♛',
  king:   '♚',
};

const GAME_OVER_MESSAGES: Record<string, string> = {
  checkmate: 'Checkmate!',
  stalemate: "Stalemate — it's a draw!",
  draw:      "It's a draw!",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TurnIndicator({ isPlayerTurn, isGameOver, awaitingCpuMove, gameStatus }: {
  isPlayerTurn: boolean;
  isGameOver: boolean;
  awaitingCpuMove: boolean;
  gameStatus: GameStatus;
}) {
  if (isGameOver) {
    return (
      <div className="rounded-xl px-4 py-3 text-center font-bold text-lg bg-purple-100 text-purple-800 border-2 border-purple-300">
        {GAME_OVER_MESSAGES[gameStatus] ?? 'Game over!'}
      </div>
    );
  }

  if (awaitingCpuMove) {
    return (
      <div className="rounded-xl px-4 py-3 text-center font-bold text-lg bg-orange-100 text-orange-800 border-2 border-orange-300">
        Read the feedback, then let the computer move!
      </div>
    );
  }

  return isPlayerTurn ? (
    <div className="rounded-xl px-4 py-3 text-center font-bold text-lg bg-green-100 text-green-800 border-2 border-green-300">
      Your turn! (White)
    </div>
  ) : (
    <div className="rounded-xl px-4 py-3 text-center font-bold text-lg bg-gray-100 text-gray-600 border-2 border-gray-200">
      Computer is thinking...
    </div>
  );
}

function CoachFeedback({ feedback }: { feedback: string | null }) {
  return (
    <div className="rounded-xl px-4 py-4 bg-yellow-50 border-2 border-yellow-200 min-h-[80px] flex items-center">
      {feedback === null ? (
        <p className="animate-pulse text-yellow-700 text-sm font-medium">
          Coach is thinking...
        </p>
      ) : (
        <p className="text-yellow-900 text-sm font-medium leading-relaxed">
          {feedback}
        </p>
      )}
    </div>
  );
}

function CapturedRow({ label, pieces }: { label: string; pieces: string[] }) {
  if (pieces.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 shrink-0">{label}</span>
      <span className="text-lg leading-none tracking-wide">
        {pieces.map((p, i) => (
          <span key={i}>{PIECE_EMOJI[p] ?? p}</span>
        ))}
      </span>
    </div>
  );
}

function CapturedPiecesDisplay({ capturedPieces }: { capturedPieces: CapturedPieces }) {
  const hasAny = capturedPieces.byWhite.length > 0 || capturedPieces.byBlack.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-1">
      <CapturedRow label="You got:"      pieces={capturedPieces.byWhite} />
      <CapturedRow label="Computer got:" pieces={capturedPieces.byBlack} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Pure presentational sidebar panel — no state, no logic.
 * Shows turn status, Coach feedback, captured pieces, and action buttons.
 */
export function FeedbackPanel({
  isPlayerTurn,
  isGameOver,
  gameStatus,
  feedback,
  capturedPieces,
  awaitingCpuMove,
  onCpuTurn,
  onNewGame,
}: FeedbackPanelProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <TurnIndicator
        isPlayerTurn={isPlayerTurn}
        isGameOver={isGameOver}
        awaitingCpuMove={awaitingCpuMove}
        gameStatus={gameStatus}
      />

      <CoachFeedback feedback={feedback} />

      <CapturedPiecesDisplay capturedPieces={capturedPieces} />

      {awaitingCpuMove && !isGameOver && (
        <button
          onClick={onCpuTurn}
          className="rounded-xl px-4 py-3 font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all"
        >
          OK, computer — your turn!
        </button>
      )}

      <button
        onClick={onNewGame}
        className="mt-auto rounded-xl px-4 py-3 font-bold text-white bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all"
      >
        New Game
      </button>
    </div>
  );
}
