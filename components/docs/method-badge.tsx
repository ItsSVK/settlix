const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  POST: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  PATCH: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-400 ring-red-500/20',
}

interface MethodBadgeProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
}

export function MethodBadge({ method, path }: MethodBadgeProps) {
  return (
    <div className='mb-4 flex items-center gap-3'>
      <span
        className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold uppercase ring-1 ${METHOD_COLOR[method]}`}
      >
        {method}
      </span>
      <code className='font-mono text-sm text-foreground/80'>{path}</code>
    </div>
  )
}
