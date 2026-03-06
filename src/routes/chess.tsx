import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { ChessBoard } from '~/components/chess/ChessBoard';
import { FeedbackPanel } from '~/components/chess/FeedbackPanel';
import { useChessGame, type MoveResult } from '~/hooks/useChessGame';
import { useStockfish } from '~/hooks/useStockfish';
import { getChessFeedback } from '~/server/function/chess-feedback';

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/chess')({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ClientOnly fallback={<LoadingSpinner />}>
      <ChessGame />
    </ClientOnly>
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-white text-xl font-semibold animate-pulse">Loading Chess...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChessGame — wires hooks, handles move flow
// ---------------------------------------------------------------------------

function ChessGame() {
  const {
    fen,
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
  } = useChessGame();

  const [feedback, setFeedback] = useState<string | null>(null);

  // Cleared on reset to cancel any in-flight Stockfish delay
  const cpuDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Core move handler — shared by player clicks, drags, and CPU response
  // ---------------------------------------------------------------------------

  const handleMove = useCallback(
    async (from: string, to: string, promotion?: string) => {
      const result: MoveResult | null = makeMove(from, to, promotion ?? 'q');
      if (!result) return; // illegal move

      // Show "Coach is thinking..." immediately
      setFeedback(null);

      // Ask Claude for feedback (non-blocking — result lands whenever ready)
      getChessFeedback({
        data: {
          san: result.san,
          moveNumber: result.moveNumber,
          isPlayerMove: result.isPlayerMove,
          isCapture: result.isCapture,
          capturedPiece: result.capturedPiece,
          isCheck: result.isCheck,
          isCheckmate: result.isCheckmate,
          isDraw: result.isDraw,
        },
      }).then(({ feedback: text }) => setFeedback(text));

      // Ask Stockfish to reply after a short delay (gives board time to animate)
      if (!result.isCheckmate && !result.isDraw && result.isPlayerMove) {
        cpuDelayRef.current = setTimeout(() => {
          requestMove(result.fen);
        }, 300);
      }
    },
    [makeMove], // requestMove added via closure below — see note
  );

  // onBestMove is stabilised inside useStockfish via a ref, so handleMove
  // identity changing between renders is fine — the latest version is always called.
  const { requestMove, resetEngine } = useStockfish({
    skillLevel: 1,
    depth: 3,
    onBestMove: useCallback(
      (uciMove: string) => {
        const from = uciMove.slice(0, 2);
        const to   = uciMove.slice(2, 4);
        const promotion = uciMove[4]; // defined only for pawn promotions
        handleMove(from, to, promotion);
      },
      [handleMove],
    ),
  });

  // ---------------------------------------------------------------------------
  // Click handler — distinguish select vs move
  // ---------------------------------------------------------------------------

  const onSquareClick = useCallback(
    (square: string) => {
      if (!isPlayerTurn || isGameOver) return;

      if (selectedSquare && legalMoveSquares.includes(square)) {
        handleMove(selectedSquare, square);
      } else {
        selectSquare(square);
      }
    },
    [isPlayerTurn, isGameOver, selectedSquare, legalMoveSquares, handleMove, selectSquare],
  );

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const onNewGame = useCallback(() => {
    if (cpuDelayRef.current) clearTimeout(cpuDelayRef.current);
    resetGame();
    resetEngine();
    setFeedback(null);
  }, [resetGame, resetEngine]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex flex-col items-center px-4 py-8 gap-8">
      {/* Title */}
      <h1 className="text-4xl font-extrabold text-white drop-shadow-lg tracking-tight">
        Chess Coach
      </h1>

      {/* Board + Panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-5xl">
        <div className="w-full max-w-[560px]">
          <ChessBoard
            fen={fen}
            selectedSquare={selectedSquare}
            legalMoveSquares={legalMoveSquares}
            lastMove={lastMove}
            isPlayerTurn={isPlayerTurn}
            isGameOver={isGameOver}
            onSquareClick={onSquareClick}
            onPieceDrop={(from, to) => handleMove(from, to)}
          />
        </div>

        <div className="w-full lg:w-72">
          <FeedbackPanel
            isPlayerTurn={isPlayerTurn}
            isGameOver={isGameOver}
            gameStatus={gameStatus}
            feedback={feedback}
            capturedPieces={capturedPieces}
            onNewGame={onNewGame}
          />
        </div>
      </div>
    </div>
  );
}
