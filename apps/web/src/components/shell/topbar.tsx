"use client"

import { Bell } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  ProjectSwitcher,
  type Project,
} from "@/components/shell/project-switcher"

export function Topbar({
  projects,
  activeProjectId,
  canCreateProject = false,
  onSelectProject,
  breadcrumb,
}: {
  projects: Project[]
  activeProjectId: string | null
  canCreateProject?: boolean
  onSelectProject?: (id: string) => void
  breadcrumb?: string
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <ProjectSwitcher
          projects={projects}
          activeId={activeProjectId}
          canCreate={canCreateProject}
          onSelect={onSelectProject}
        />
        {breadcrumb && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-medium text-foreground">
              {breadcrumb}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-secondary"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}