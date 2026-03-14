'use client';

import { type CreateTRPCReact, createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@vambiant/api';

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
