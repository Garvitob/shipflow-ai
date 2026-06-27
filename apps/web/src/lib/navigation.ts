import {
  LayoutDashboard,
  Inbox,
  Ticket,
  KanbanSquare,
  GitPullRequest,
  ClipboardCheck,
  ListChecks,
  Users,
  CreditCard,
  GitBranch,
  FolderKanban,
  type LucideIcon,
} from "lucide-react"

export type Role = "ADMIN" | "PM" | "SENIOR_ENG" | "DEVELOPER" | "CLIENT"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type NavSection = {
  title?: string
  items: NavItem[]
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  PM: "Product Manager",
  SENIOR_ENG: "Senior Engineer",
  DEVELOPER: "Developer",
  CLIENT: "Client",
}

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  PM: "/pm",
  SENIOR_ENG: "/review",
  DEVELOPER: "/dev",
  CLIENT: "/portal",
}

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      items: [
        { label: "Overview", href: "/admin", icon: LayoutDashboard },
        { label: "Projects", href: "/admin/projects", icon: FolderKanban },
        { label: "Members", href: "/admin/members", icon: Users },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "GitHub", href: "/admin/github", icon: GitBranch },
        { label: "Billing", href: "/admin/billing", icon: CreditCard },
      ],
    },
  ],
  PM: [
    {
      items: [
        { label: "Overview", href: "/pm", icon: LayoutDashboard },
        { label: "Requests", href: "/pm/requests", icon: Inbox },
        { label: "Task Board", href: "/pm/tasks", icon: KanbanSquare },
      ],
    },
  ],
  SENIOR_ENG: [
    {
      items: [
        { label: "Overview", href: "/review", icon: LayoutDashboard },
        { label: "Reviews", href: "/review/queue", icon: ClipboardCheck },
        { label: "Task Distribution", href: "/review/tasks", icon: ListChecks },
      ],
    },
  ],
  DEVELOPER: [
    {
      items: [
        { label: "Overview", href: "/dev", icon: LayoutDashboard },
        { label: "My Tasks", href: "/dev/tasks", icon: ListChecks },
        { label: "Pull Requests", href: "/dev/prs", icon: GitPullRequest },
      ],
    },
  ],
  CLIENT: [
    {
      items: [
        { label: "Overview", href: "/portal", icon: LayoutDashboard },
        { label: "My Tickets", href: "/portal/tickets", icon: Ticket },
      ],
    },
  ],
}