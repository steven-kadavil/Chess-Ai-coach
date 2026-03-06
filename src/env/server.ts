import { createEnv } from '@t3-oss/env-core';
import * as z from 'zod';

export const env = createEnv({
  server: {
    MY_SECRET_VAR: z.url().optional(),
    ANTHROPIC_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
});
