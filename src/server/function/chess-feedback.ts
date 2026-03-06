import Anthropic from '@anthropic-ai/sdk';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { env } from '~/env/server';

// ---------------------------------------------------------------------------
// Schema & types
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  san: z.string(), // e.g. "Nf3", "O-O", "exd5+"
  moveNumber: z.number().int().positive(),
  isPlayerMove: z.boolean(), // true = White (child), false = Black (CPU)
  isCapture: z.boolean(),
  capturedPiece: z.string().optional(), // "pawn" | "knight" | "bishop" | "rook" | "queen"
  isCheck: z.boolean(),
  isCheckmate: z.boolean(),
  isDraw: z.boolean(),
});

export type ChessFeedbackInput = z.infer<typeof inputSchema>;

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const COACH_SYSTEM_PROMPT = `\
You are "Coach Chess", a warm and enthusiastic chess coach for a 7-year-old child.

Rules:
- Maximum 2 short sentences per response
- Use simple words a second-grader understands
- Always be encouraging — never critical
- Include 1-2 relevant emoji
- When the child makes a mistake, frame it as a fun learning moment`;

function buildUserPrompt(input: ChessFeedbackInput): string {
  if (input.isCheckmate) {
    return input.isPlayerMove
      ? 'The child just won with checkmate! Write a big celebratory response.'
      : 'The computer just checkmated the child. Encourage them warmly to try again.';
  }

  if (input.isDraw) {
    return 'The game ended in a draw. Celebrate the effort and invite them to play again.';
  }

  const captureNote =
    input.isCapture && input.capturedPiece
      ? `They captured the opponent's ${input.capturedPiece}.`
      : '';

  const checkNote = input.isCheck
    ? input.isPlayerMove
      ? 'This move puts the computer in check!'
      : "The child is now in check — remind them to move their king to safety."
    : '';

  const context = [captureNote, checkNote].filter(Boolean).join(' ');

  return input.isPlayerMove
    ? `The child (White) just played ${input.san} on move ${input.moveNumber}. ${context} Encourage their move briefly.`
    : `The computer (Black) just played ${input.san}. ${context} Give the child a short tip on what to think about next.`;
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
      max_tokens: 80,
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(data) }],
    });

    const feedback =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return { feedback };
  });
