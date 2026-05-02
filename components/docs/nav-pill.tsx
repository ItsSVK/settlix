interface NavPillProps {
  href: string
  label: string
  isActive?: boolean
}

export function NavPill({ href, label, isActive }: NavPillProps) {
  return (
    <a
      href={href}
      className={`block rounded-xl px-4 py-2 text-sm transition-all duration-200 ${
        isActive
          ? 'bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-300 font-semibold'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {label}
    </a>
  )
}
