"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, MoreHorizontal, Plus } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { sendMemberInvite } from "@/app/admin/projects/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type MemberRole = "PM" | "SENIOR_ENG" | "DEVELOPER" | "CLIENT"

const ROLE_LABEL: Record<string, string> = {
  PM: "Product Manager",
  SENIOR_ENG: "Senior Engineer",
  DEVELOPER: "Developer",
  CLIENT: "Client",
}

const TYPE_LABEL: Record<string, string> = {
  EXISTING: "Existing",
  NEW: "New",
}

const TEAM_ROLES: MemberRole[] = ["PM", "SENIOR_ENG", "DEVELOPER"]

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

export function ProjectDetail({ projectId }: { projectId: string }) {
  const project = trpc.projects.get.useQuery({ id: projectId })

  if (project.isLoading) {
    return <DetailSkeleton />
  }

  if (project.error || !project.data) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-8">
        <BackLink />
        <div className="mt-10 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-foreground">
            This project couldn&apos;t be found.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/admin">Back to projects</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const p = project.data
  const members = p.members
  const team = members.filter((m) => TEAM_ROLES.includes(m.role as MemberRole))
  const clients = members.filter((m) => m.role === "CLIENT")

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <BackLink />

      <div className="mt-5">
        <h1 className="text-2xl font-semibold leading-none tracking-[-0.02em] text-foreground">
          {p.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {p.gitHubRepo && (
            <>
              <span className="font-mono">{p.gitHubRepo.repoFullName}</span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          <span>{TYPE_LABEL[p.projectType]}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="font-mono">{formatDate(p.createdAt)}</span>
        </p>
      </div>

      <PeopleSection
        projectId={projectId}
        team={team}
        clients={clients}
        onChanged={() => project.refetch()}
      />

      <ContextSection project={p} onSaved={() => project.refetch()} />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Projects
    </Link>
  )
}

type Member = {
  id: string
  role: string
  createdAt: Date
  user: { id: string; name: string; email: string }
  status: "active" | "pending"
}

function PeopleSection({
  projectId,
  team,
  clients,
  onChanged,
}: {
  projectId: string
  team: Member[]
  clients: Member[]
  onChanged: () => void
}) {
  const [addOpen, setAddOpen] = React.useState(false)
  const empty = team.length === 0 && clients.length === 0

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">People</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add person
        </Button>
      </div>

      {empty ? (
        <div className="mt-4 rounded-xl border border-border bg-card px-6 py-14">
          <div className="mx-auto max-w-sm text-center">
            <h3 className="text-sm font-medium text-foreground">
              No one&apos;s on this project yet
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Add your team and clients to start delivering features.
            </p>
            <div className="mt-5 flex justify-center">
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add person
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          <MemberGroup
            label="Team"
            caption="The people building this project."
            members={team}
            projectId={projectId}
            onChanged={onChanged}
          />
          <MemberGroup
            label="Clients"
            caption="The people who raise requests for this project."
            members={clients}
            projectId={projectId}
            onChanged={onChanged}
          />
        </div>
      )}

      <AddPersonDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={onChanged}
      />
    </section>
  )
}

function MemberGroup({
  label,
  caption,
  members,
  projectId,
  onChanged,
}: {
  label: string
  caption: string
  members: Member[]
  projectId: string
  onChanged: () => void
}) {
  if (members.length === 0) return null

  return (
    <div>
      <div className="mb-2">
        <h3 className="text-[13px] font-medium text-foreground">{label}</h3>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              projectId={projectId}
              onChanged={onChanged}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

function MemberRow({
  member,
  projectId,
  onChanged,
}: {
  member: Member
  projectId: string
  onChanged: () => void
}) {
  const removeMember = trpc.projects.removeMember.useMutation({
    onSuccess: () => onChanged(),
  })

  return (
    <li className="group flex items-center gap-4 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
        {member.user.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.user.name}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {member.user.email}
        </p>
      </div>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {ROLE_LABEL[member.role]}
      </span>
      <StatusBadge status={member.status} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Member actions"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-secondary group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              removeMember.mutate({ projectId, memberId: member.id })
            }
            className="text-destructive focus:text-destructive"
          >
            Remove from project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function StatusBadge({ status }: { status: "active" | "pending" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      Pending
    </span>
  )
}

function AddPersonDialog({
  projectId,
  open,
  onOpenChange,
  onAdded,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<MemberRole>("DEVELOPER")
  const [error, setError] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)

  const addMember = trpc.projects.addMember.useMutation()

  React.useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setRole("DEVELOPER")
      setError(null)
      setSending(false)
    }
  }, [open])

  async function handleSubmit() {
    setError(null)

    if (name.trim().length < 1) {
      setError("Enter a name.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email.")
      return
    }

    setSending(true)
    try {
      const result = await addMember.mutateAsync({
        projectId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
      })

      if (result.isNewUser) {
        await sendMemberInvite(result.email)
      }

      onAdded()
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't add this person."
      setError(message)
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add person</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email to set their password and join the project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Cooper"
              disabled={sending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="font-mono"
              disabled={sending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as MemberRole)}
              disabled={sending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PM">Product Manager</SelectItem>
                <SelectItem value="SENIOR_ENG">Senior Engineer</SelectItem>
                <SelectItem value="DEVELOPER">Developer</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? "Sending…" : "Send invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type ProjectData = {
  id: string
  name: string
  description: string
  techStack: string
  existingFeatures: string
  businessGoals: string
  targetUsers: string
  projectType: string
}

function ContextSection({
  project,
  onSaved,
}: {
  project: ProjectData
  onSaved: () => void
}) {
  const [editing, setEditing] = React.useState(false)

  const isNew = project.projectType === "NEW"
  const featuresLabel = isNew ? "Planned features" : "Existing features"

  if (editing) {
    return (
      <EditContext
        project={project}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          onSaved()
        }}
      />
    )
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Context</h2>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <dl className="divide-y divide-border">
          <ContextRow label="Description" value={project.description} />
          <ContextRow label="Type" value={TYPE_LABEL[project.projectType]} />
          <ContextRow label="Tech stack" value={project.techStack} mono />
          <ContextRow label={featuresLabel} value={project.existingFeatures} />
          <ContextRow label="Business goals" value={project.businessGoals} />
          <ContextRow label="Target users" value={project.targetUsers} />
        </dl>
      </div>
    </section>
  )
}

function ContextRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "flex-1 text-sm text-foreground",
          mono && "font-mono text-[13px]"
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function EditContext({
  project,
  onCancel,
  onSaved,
}: {
  project: ProjectData
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = React.useState({
    name: project.name,
    description: project.description,
    techStack: project.techStack,
    existingFeatures: project.existingFeatures,
    businessGoals: project.businessGoals,
    targetUsers: project.targetUsers,
    projectType: project.projectType as "EXISTING" | "NEW",
  })
  const [error, setError] = React.useState<string | null>(null)

  const update = trpc.projects.update.useMutation({
    onSuccess: () => onSaved(),
    onError: (err) => setError(err.message || "Couldn't save changes."),
  })

  const isNew = form.projectType === "NEW"

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setError(null)
    if (form.name.trim().length < 2) {
      setError("Name must be at least 2 characters.")
      return
    }
    if (form.description.trim().length < 10) {
      setError("Description is too short.")
      return
    }
    update.mutate({
      id: project.id,
      name: form.name.trim(),
      description: form.description.trim(),
      techStack: form.techStack.trim(),
      existingFeatures: form.existingFeatures.trim(),
      businessGoals: form.businessGoals.trim(),
      targetUsers: form.targetUsers.trim(),
      projectType: form.projectType,
    })
  }

  const saving = update.isPending

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Context</h2>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5">
          <EditField label="Name">
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              disabled={saving}
            />
          </EditField>
          <EditField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              disabled={saving}
            />
          </EditField>
          <EditField label="Type">
            <Segmented
              value={form.projectType}
              onChange={(v) => setField("projectType", v)}
              disabled={saving}
              options={[
                { value: "EXISTING", label: "Existing" },
                { value: "NEW", label: "New" },
              ]}
            />
          </EditField>
          <EditField label="Tech stack">
            <Textarea
              value={form.techStack}
              onChange={(e) => setField("techStack", e.target.value)}
              rows={2}
              disabled={saving}
            />
          </EditField>
          <EditField label={isNew ? "Planned features" : "Existing features"}>
            <Textarea
              value={form.existingFeatures}
              onChange={(e) => setField("existingFeatures", e.target.value)}
              rows={2}
              disabled={saving}
            />
          </EditField>
          <EditField label="Business goals">
            <Textarea
              value={form.businessGoals}
              onChange={(e) => setField("businessGoals", e.target.value)}
              rows={2}
              disabled={saving}
            />
          </EditField>
          <EditField label="Target users">
            <Textarea
              value={form.targetUsers}
              onChange={(e) => setField("targetUsers", e.target.value)}
              rows={2}
              disabled={saving}
            />
          </EditField>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function EditField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
}) {
  return (
    <div className="inline-flex w-fit rounded-md border border-input bg-background p-0.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
      <div className="mt-5">
        <div className="h-7 w-56 animate-pulse rounded bg-secondary" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-secondary" />
      </div>
      <div className="mt-10">
        <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-secondary" />
      </div>
    </div>
  )
}