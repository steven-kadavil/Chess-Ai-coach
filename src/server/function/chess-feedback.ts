import Anthropic from '@anthropic-ai/sdk';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { env } from '~/env/server';

// ---------------------------------------------------------------------------
// Schema & types
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  fen: z.string(),            // full board position — gives Claude real context
  san: z.string(),            // e.g. "Nf3", "O-O", "exd5+"
  moveNumber: z.number().int().positive(),
  isPlayerMove: z.boolean(),  // true = White (child), false = Black (CPU)
  isCapture: z.boolean(),
  capturedPiece: z.string().optional(),
  isCheck: z.boolean(),
  isCheckmate: z.boolean(),
  isDraw: z.boolean(),
});

export type ChessFeedbackInput = z.infer<typeof inputSchema>;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const COACH_SYSTEM_PROMPT = `\
You are "Coach Chess", a chess coach for a 7-year-old child.

You will receive the current board position in FEN notation alongside the last move.
Use the FEN to give specific, board-aware advice based on the actual pieces and squares.

Two different types of messages:
1. CHILD'S MOVE — celebrate and give one tip about what to watch for next.
2. COMPUTER'S MOVE — do NOT praise or celebrate. Instead, briefly explain what the opponent just did, then tell the child what they should think about on their turn.

Rules:
- Maximum 2 short sentences per response
- Use simple words a second-grader understands
- Never critical or discouraging, but don't congratulate the opponent's moves
- Include 1-2 relevant emoji
- Be specific to the actual board position, not generic`;

function buildUserPrompt(input: ChessFeedbackInput): string {
  if (input.isCheckmate) {
    return input.isPlayerMove
      ? `The child just won with checkmate playing ${input.san}! Board: ${input.fen}. Celebrate big!`
      : `The computer checkmated the child with ${input.san}. Board: ${input.fen}. Encourage them warmly to try again.`;
  }

  if (input.isDraw) {
    return `The game ended in a draw. Board: ${input.fen}. Celebrate the effort and invite them to play again.`;
  }

  const captureNote = input.isCapture && input.capturedPiece
    ? input.isPlayerMove
      ? `They captured the opponent's ${input.capturedPiece}.`
      : `It captured your ${input.capturedPiece}.`
    : '';

  const checkNote = input.isCheck
    ? input.isPlayerMove
      ? 'This move puts the computer in check!'
      : 'The child is now in check and must move their king to safety.'
    : '';

  const context = [captureNote, checkNote].filter(Boolean).join(' ');

  return input.isPlayerMove
    ? `CHILD'S MOVE: The child (White) just played ${input.san} on move ${input.moveNumber}. ${context}
Board position (FEN): ${input.fen}
Celebrate briefly, then give one specific tip about what to watch for next.`
    : `COMPUTER'S MOVE: The computer (Black) just played ${input.san}. ${context}
Board position (FEN): ${input.fen}
Do NOT say "great move" or praise the computer. Explain in one sentence what the computer just did, then tell the child one thing to think about on their next turn.`;
}

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export const getChessFeedback = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ feedback: string }> => {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(data) }],
    });

    const feedback =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return { feedback };
  });
