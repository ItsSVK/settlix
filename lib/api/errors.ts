import { NextResponse } from 'next/server'

import { apiLogger } from '@/lib/api/logger'
import { CONFIGURATION, INTERNAL, INVALID_JSON, UPSTREAM } from '@/lib/api/constants'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly exposeDetails?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Missing or invalid server configuration (do not retry as a client validation issue). */
export class ConfigurationError extends ApiError {
  constructor(message: string) {
    super(503, message, CONFIGURATION)
    this.name = 'ConfigurationError'
  }
}

export class UpstreamError extends ApiError {
  constructor(message: string, code = UPSTREAM) {
    super(502, message, code)
    this.name = 'UpstreamError'
  }
}

export function toApiResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    const body: Record<string, unknown> = {
      error: error.message,
      code: error.code,
    }
    if (error.exposeDetails !== undefined) {
      body.details = error.exposeDetails
    }
    return NextResponse.json(body, { status: error.status })
  }

  apiLogger.error('Unhandled route error', error)
  return NextResponse.json({ error: 'Internal server error', code: INTERNAL }, { status: 500 })
}

export async function handleApi(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (error) {
    return toApiResponse(error)
  }
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ApiError(400, 'Invalid JSON', INVALID_JSON)
  }
}
