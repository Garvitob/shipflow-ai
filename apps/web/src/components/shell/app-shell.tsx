"use client"

import * as React from "react"
import { Sidebar } from "@/components/shell/sidebar"
import { Topbar } from "@/components/shell/topbar"
import { type Role, type NavSection } from "@/lib/navigation"
import { type Workspace } from "@/components/shell/workspace-identity"
import { type SessionUser } from "@/components/shell/user-menu"
import { type Project } from "@/components/shell/project-switcher"

export function AppShell({
  role,
  workspace,
  user,
  projects,
  activeProjectId,
  canCreateProject = false,
  onSelectProject,
  breadcrumb,
  navSections,
  children,
}: {
  role: Role
  workspace: Workspace
  user: SessionUser
  projects: Project[]
  activeProjectId: string | null
  canCreateProject?: boolean
  onSelectProject?: (id: string) => void
  breadcrumb?: string
  navSections?: NavSection[]
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        role={role}
        workspace={workspace}
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        navSections={navSections}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          projects={projects}
          activeProjectId={activeProjectId}
          canCreateProject={canCreateProject}
          onSelectProject={onSelectProject}
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}