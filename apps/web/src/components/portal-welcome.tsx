export function PortalWelcome({
  title,
  name,
  workspaceName,
  description,
}: {
  title: string
  name: string
  workspaceName: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Welcome back, {name.split(" ")[0]}.
      </p>
      <div className="mt-10 rounded-xl border border-border bg-card p-8">
        <p className="text-sm text-foreground">{description}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {workspaceName}
        </p>
      </div>
    </div>
  )
}