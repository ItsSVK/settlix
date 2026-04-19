type LogMeta = Record<string, unknown> | undefined

function serialize(err: unknown): { name?: string; message?: string; stack?: string } | undefined {
  if (err === undefined || err === null) return undefined
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }
  }
  return { message: String(err) }
}

/**
 * Structured logs for route handlers and services (JSON lines are easy to ship to log drains).
 */
export const apiLogger = {
  info(message: string, meta?: LogMeta) {
    console.log(JSON.stringify({ level: 'info', scope: 'settlix-api', message, ...meta }))
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(JSON.stringify({ level: 'warn', scope: 'settlix-api', message, ...meta }))
  },
  error(message: string, err?: unknown, meta?: LogMeta) {
    console.error(
      JSON.stringify({
        level: 'error',
        scope: 'settlix-api',
        message,
        error: serialize(err),
        ...meta,
      }),
    )
  },
}
