import { useCallback, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseStockfishOptions {
  /** 0–20. Lower = weaker. Use 1 for a beginner child opponent. */
  skillLevel?: number;
  /** Search depth. 3 is fast and beatable for a 7-year-old. */
  depth?: number;
  /** Called with a UCI move string (e.g. "e2e4", "e7e8q") once Stockfish decides. */
  onBestMove: (uciMove: string) => void;
}

// ---------------------------------------------------------------------------
// UCI helpers
// ---------------------------------------------------------------------------

function sendUci(worker: Worker, ...commands: string[]) {
  for (const cmd of commands) worker.postMessage(cmd);
}

function initEngine(worker: Worker, skillLevel: number) {
  sendUci(
    worker,
    'uci',
    `setoption name Skill Level value ${skillLevel}`,
    'ucinewgame',
    'isready',
  );
}

function parseBestMove(line: string): string | null {
  if (!line.startsWith('bestmove')) return null;
  const move = line.split(' ')[1];
  return move && move !== '(none)' ? move : null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages a Stockfish Web Worker for CPU chess moves.
 *
 * The useEffect here is intentional — a Web Worker is a real external system,
 * not derived state, so lifecycle management via an effect is correct per
 * project conventions (CLAUDE.md rule #6).
 *
 * Stockfish is served from /public/stockfish.js (copied from the npm package)
 * so it can be loaded as a plain worker URL without WASM or cross-origin headers.
 */
export function useStockfish({
  skillLevel = 1,
  depth = 3,
  onBestMove,
}: UseStockfishOptions) {
  const workerRef = useRef<Worker | null>(null);

  // Ref-stabilise the callback so the worker never needs to be recreated
  // just because the parent component re-rendered with a new function reference.
  const onBestMoveRef = useRef(onBestMove);
  onBestMoveRef.current = onBestMove;

  useEffect(() => {
    const worker = new Worker('/stockfish.js');

    worker.onmessage = (event: MessageEvent<string>) => {
      const bestMove = parseBestMove(event.data);
      if (bestMove) onBestMoveRef.current(bestMove);
    };

    initEngine(worker, skillLevel);
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [skillLevel]); // Re-initialise only when skill level changes

  // Signal the engine to find the best move for the given position
  const requestMove = useCallback(
    (fen: string) => {
      const worker = workerRef.current;
      if (!worker) return;
      sendUci(worker, `position fen ${fen}`, `go depth ${depth}`);
    },
    [depth],
  );

  // Reset engine state between games without recreating the worker
  const resetEngine = useCallback(() => {
    workerRef.current?.postMessage('ucinewgame');
  }, []);

  return { requestMove, resetEngine };
}
