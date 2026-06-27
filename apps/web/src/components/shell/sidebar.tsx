"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftClose, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { NAV_BY_ROLE, type Role } from "@/lib/navigation"
import {
  WorkspaceIdentity,
  type Workspace,
} from "@/components/shell/workspace-identity"
import { UserMenu, type SessionUser } from "@/components/shell/user-menu"

export function Sidebar({
  role,
  workspace,
  user,
  collapsed,
  onToggle,
}: {
  role: Role
  workspace: Workspace
  user: SessionUser
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()
  const sections = NAV_BY_ROLE[role]

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Top: workspace identity + collapse toggle */}
        <div className="flex items-center gap-1 border-b border-sidebar-border p-2">
          <div className="min-w-0 flex-1">
            <WorkspaceIdentity workspace={workspace} collapsed={collapsed} />
          </div>
          {!collapsed && (
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <PanelLeftClose className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        {/* Collapsed expand button */}
        {collapsed && (
          <div className="flex justify-center border-b border-sidebar-border p-2">
            <button
              onClick={onToggle}
              aria-label="Expand sidebar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2">
          {sections.map((section, i) => (
            <div key={i} className={cn(i > 0 && "mt-4")}>
              {section.title && !collapsed && (
                <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-sidebar-muted">
                  {section.title}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href + "/"))
                  const Icon = item.icon

                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        collapsed && "justify-center",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )

                  return (
                    <li key={item.label}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom: user menu */}
        <div className="border-t border-sidebar-border p-2">
          <UserMenu user={user} collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  )
}