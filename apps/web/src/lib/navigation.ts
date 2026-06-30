import {
  LayoutDashboard,
  Inbox,
  KanbanSquare,
  GitPullRequest,
  ClipboardCheck,
  ListChecks,
  ScrollText,
  CreditCard,
  GitBranch,
  FolderKanban,
  MessageSquarePlus,
  type LucideIcon,
} from "lucide-react"

export type Role = "ADMIN" | "PM" | "SENIOR_ENG" | "DEVELOPER" | "CLIENT"

export type NavIconName =
  | "dashboard"
  | "inbox"
  | "board"
  | "pullRequest"
  | "review"
  | "tasks"
  | "audit"
  | "billing"
  | "github"
  | "projects"
  | "newRequest"

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  inbox: Inbox,
  board: KanbanSquare,
  pullRequest: GitPullRequest,
  review: ClipboardCheck,
  tasks: ListChecks,
  audit: ScrollText,
  billing: CreditCard,
  github: GitBranch,
  projects: FolderKanban,
  newRequest: MessageSquarePlus,
}

export type NavItem = {
  label: string
  href: string
  icon: NavIconName
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
        { label: "Overview", href: "/admin", icon: "dashboard" },
        { label: "Projects", href: "/admin/projects", icon: "projects" },
        { label: "Audit log", href: "/admin/audit", icon: "audit" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "GitHub", href: "/admin/github", icon: "github" },
        { label: "Billing", href: "/admin/billing", icon: "billing" },
      ],
    },
  ],
  PM: [
    {
      items: [
        { label: "Overview", href: "/pm", icon: "dashboard" },
        { label: "Requests", href: "/pm/requests", icon: "inbox" },
        { label: "Task Board", href: "/pm/tasks", icon: "board" },
      ],
    },
  ],
  SENIOR_ENG: [
    {
      items: [
        { label: "Overview", href: "/review", icon: "dashboard" },
        { label: "Reviews", href: "/review/queue", icon: "review" },
        { label: "Task Distribution", href: "/review/tasks", icon: "tasks" },
      ],
    },
  ],
  DEVELOPER: [
    {
      items: [
        { label: "Overview", href: "/dev", icon: "dashboard" },
        { label: "My Tasks", href: "/dev/tasks", icon: "tasks" },
        { label: "Pull Requests", href: "/dev/prs", icon: "pullRequest" },
      ],
    },
  ],
  CLIENT: [
    {
      items: [{ label: "Overview", href: "/portal", icon: "dashboard" }],
    },
  ],
}