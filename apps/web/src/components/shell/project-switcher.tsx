"use client"

import { ChevronsUpDown, Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type Project = {
  id: string
  name: string
}

export function ProjectSwitcher({
  projects,
  activeId,
  canCreate = false,
  onSelect,
}: {
  projects: Project[]
  activeId: string | null
  canCreate?: boolean
  onSelect?: (id: string) => void
}) {
  const router = useRouter()
  const active = projects.find((p) => p.id === activeId) ?? null

  function handleSelect(id: string) {
    if (onSelect) {
      onSelect(id)
    } else {
      router.push(`/admin/projects/${id}`)
    }
  }

  if (projects.length === 0) {
    return <span className="text-sm text-muted-foreground">No projects</span>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <span className="max-w-[180px] truncate">
            {active ? active.name : "Select project"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        <DropdownMenuLabel>Projects</DropdownMenuLabel>
        <div className="max-h-[280px] overflow-y-auto">
          {projects.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => handleSelect(p.id)}>
              <div className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-[10px] font-semibold text-secondary-foreground">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate">{p.name}</span>
              {p.id === activeId && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </div>
        {canCreate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/projects/new")}>
              <Plus className="h-4 w-4" />
              <span>New project</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}