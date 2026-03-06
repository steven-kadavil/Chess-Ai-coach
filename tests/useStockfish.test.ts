import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStockfish } from '~/hooks/useStockfish';

// ---------------------------------------------------------------------------
// Mock Worker
// ---------------------------------------------------------------------------

class MockWorker {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  private messages: string[] = [];

  postMessage(data: string) {
    this.messages.push(data);
  }

  terminate() {}

  /** Test helper — simulate Stockfish responding with a bestmove line. */
  simulateResponse(line: string) {
    this.onmessage?.(new MessageEvent('message', { data: line }));
  }

  getSentMessages() {
    return this.messages;
  }
}

let mockWorkerInstance: MockWorker;

beforeEach(() => {
  mockWorkerInstance = new MockWorker();
  vi.stubGlobal(
    'Worker',
    vi.fn(function () {
      return mockWorkerInstance;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

describe('initialisation', () => {
  it('sends correct UCI init commands on mount', () => {
    renderHook(() =>
      useStockfish({ skillLevel: 1, depth: 3, onBestMove: vi.fn() }),
    );

    const msgs = mockWorkerInstance.getSentMessages();
    expect(msgs).toContain('uci');
    expect(msgs).toContain('setoption name Skill Level value 1');
    expect(msgs).toContain('ucinewgame');
    expect(msgs).toContain('isready');
  });

  it('applies custom skill level in the UCI command', () => {
    renderHook(() =>
      useStockfish({ skillLevel: 5, depth: 3, onBestMove: vi.fn() }),
    );

    expect(mockWorkerInstance.getSentMessages()).toContain(
      'setoption name Skill Level value 5',
    );
  });

  it('terminates the worker on unmount', () => {
    const terminateSpy = vi.spyOn(mockWorkerInstance, 'terminate');
    const { unmount } = renderHook(() =>
      useStockfish({ onBestMove: vi.fn() }),
    );

    unmount();

    expect(terminateSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// requestMove
// ---------------------------------------------------------------------------

describe('requestMove', () => {
  it('sends position and go commands with the given FEN', () => {
    const { result } = renderHook(() =>
      useStockfish({ depth: 3, onBestMove: vi.fn() }),
    );
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

    act(() => result.current.requestMove(fen));

    const msgs = mockWorkerInstance.getSentMessages();
    expect(msgs).toContain(`position fen ${fen}`);
    expect(msgs).toContain('go depth 3');
  });

  it('uses the configured depth', () => {
    const { result } = renderHook(() =>
      useStockfish({ depth: 5, onBestMove: vi.fn() }),
    );

    act(() => result.current.requestMove('startpos'));

    expect(mockWorkerInstance.getSentMessages()).toContain('go depth 5');
  });
});

// ---------------------------------------------------------------------------
// onBestMove callback
// ---------------------------------------------------------------------------

describe('onBestMove callback', () => {
  it('fires with the move string when Stockfish responds', () => {
    const onBestMove = vi.fn();
    renderHook(() => useStockfish({ onBestMove }));

    act(() => mockWorkerInstance.simulateResponse('bestmove e2e4 ponder e7e5'));

    expect(onBestMove).toHaveBeenCalledOnce();
    expect(onBestMove).toHaveBeenCalledWith('e2e4');
  });

  it('ignores non-bestmove lines from the engine', () => {
    const onBestMove = vi.fn();
    renderHook(() => useStockfish({ onBestMove }));

    act(() => mockWorkerInstance.simulateResponse('info depth 3 seldepth 4'));

    expect(onBestMove).not.toHaveBeenCalled();
  });

  it('ignores bestmove (none) responses', () => {
    const onBestMove = vi.fn();
    renderHook(() => useStockfish({ onBestMove }));

    act(() => mockWorkerInstance.simulateResponse('bestmove (none)'));

    expect(onBestMove).not.toHaveBeenCalled();
  });

  it('always uses the latest onBestMove without recreating the worker', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ cb }) => useStockfish({ onBestMove: cb }),
      { initialProps: { cb: first } },
    );

    rerender({ cb: second });

    act(() => mockWorkerInstance.simulateResponse('bestmove d2d4'));

    expect(second).toHaveBeenCalledWith('d2d4');
    expect(first).not.toHaveBeenCalled();
    // Worker constructor called only once — not recreated on callback change
    expect(Worker).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// resetEngine
// ---------------------------------------------------------------------------

describe('resetEngine', () => {
  it('sends ucinewgame to clear engine state', () => {
    const { result } = renderHook(() =>
      useStockfish({ onBestMove: vi.fn() }),
    );

    act(() => result.current.resetEngine());

    // ucinewgame is sent once on init and once on reset
    const msgs = mockWorkerInstance.getSentMessages();
    expect(msgs.filter((m) => m === 'ucinewgame')).toHaveLength(2);
  });
});
