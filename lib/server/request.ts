import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return req.ip ?? forwarded ?? req.headers.get('x-real-ip') ?? 'unknown';
}

export function jsonNoStore(body: object, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}
