"use client"

import { cn } from "@/lib/utils"

export type Workspace = {
  id: string
  name: string
  plan: string
}

export function WorkspaceIdentity({
  workspace,
  collapsed,
}: {
  workspace: Workspace
  collapsed: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2 py-1.5",
        collapsed && "justify-center"
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-[13px] font-semibold text-background">
        {workspace.name.charAt(0).toUpperCase()}
      </div>
      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            {workspace.name}
          </span>
          <span className="truncate text-xs text-sidebar-muted">
            {workspace.plan}
          </span>
        </div>
      )}
    </div>
  )
}