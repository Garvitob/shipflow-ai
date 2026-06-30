"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { requestAnalysis } from "@/app/admin/projects/analysis-actions"

type ProjectType = "EXISTING" | "NEW"

type FormState = {
  name: string
  description: string
  projectType: ProjectType
  techStack: string
  existingFeatures: string
  businessGoals: string
  targetUsers: string
  repoFullName: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const INITIAL: FormState = {
  name: "",
  description: "",
  projectType: "EXISTING",
  techStack: "",
  existingFeatures: "",
  businessGoals: "",
  targetUsers: "",
  repoFullName: "",
}

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/

function validateField(key: keyof FormState, value: string): string | undefined {
  switch (key) {
    case "name":
      if (value.trim().length < 2) return "Name must be at least 2 characters."
      if (value.trim().length > 80) return "Name must be under 80 characters."
      return
    case "description":
      if (value.trim().length < 10) return "Add a slightly longer description."
      if (value.trim().length > 500) return "Description is too long."
      return
    case "techStack":
    case "existingFeatures":
    case "businessGoals":
    case "targetUsers":
      if (value.trim().length < 2) return "This field is required."
      return
    case "repoFullName":
      if (value.trim().length === 0) return "Repository is required."
      if (!REPO_PATTERN.test(value.trim())) return "Use the format owner/repo."
      return
    default:
      return
  }
}

function validateAll(state: FormState): FieldErrors {
  const errors: FieldErrors = {}
  ;(Object.keys(state) as (keyof FormState)[]).forEach((key) => {
    if (key === "projectType") return
    const err = validateField(key, state[key])
    if (err) errors[key] = err
  })
  return errors
}

export function NewProjectForm() {
  const router = useRouter()
  const [form, setForm] = React.useState<FormState>(INITIAL)
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [autoAnalyze, setAutoAnalyze] = React.useState(true)
  const autoAnalyzeRef = React.useRef(true)

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      if (autoAnalyzeRef.current) {
        // Fire-and-forget: starting analysis must never block the redirect.
        void requestAnalysis(data.id).catch(() => {})
      }
      router.push(`/admin/projects/${data.id}`)
    },
    onError: (err) => {
      setSubmitError(err.message || "Something went wrong. Please try again.")
    },
  })

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function handleBlur(key: keyof FormState) {
    if (key === "projectType") return
    const err = validateField(key, form[key])
    setErrors((prev) => ({ ...prev, [key]: err }))
  }

  function handleSubmit() {
    setSubmitError(null)
    const allErrors = validateAll(form)
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      return
    }
    createProject.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      projectType: form.projectType,
      techStack: form.techStack.trim(),
      existingFeatures: form.existingFeatures.trim(),
      businessGoals: form.businessGoals.trim(),
      targetUsers: form.targetUsers.trim(),
      repoFullName: form.repoFullName.trim(),
    })
  }

  const submitting = createProject.isPending
  const isNew = form.projectType === "NEW"

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      <div className="mt-5">
        <h1 className="text-[22px] font-semibold leading-none tracking-[-0.02em] text-foreground">
          New project
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set up a project to manage its delivery from request to ship.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <Section title="Basics">
          <Field
            label="Name"
            helper="The app or product this project covers."
            error={errors.name}
          >
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Acme Storefront"
              disabled={submitting}
              aria-invalid={!!errors.name}
            />
          </Field>

          <Field
            label="Description"
            helper="A short summary of what this project is."
            error={errors.description}
          >
            <Textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="A customer-facing storefront for ordering and tracking deliveries."
              rows={3}
              disabled={submitting}
              aria-invalid={!!errors.description}
            />
          </Field>

          <Field label="Type">
            <Segmented
              value={form.projectType}
              onChange={(v) => setField("projectType", v)}
              disabled={submitting}
              options={[
                { value: "EXISTING", label: "Existing" },
                { value: "NEW", label: "New" },
              ]}
            />
          </Field>
        </Section>

        <Section
          title="Product context"
          intro="Context the AI uses to ground feature discussions with your team and clients."
        >
          <Field
            label="Tech stack"
            helper="Languages, frameworks, and key services."
            error={errors.techStack}
          >
            <Textarea
              value={form.techStack}
              onChange={(e) => setField("techStack", e.target.value)}
              onBlur={() => handleBlur("techStack")}
              placeholder="Next.js, PostgreSQL, Stripe, AWS"
              rows={2}
              disabled={submitting}
              aria-invalid={!!errors.techStack}
            />
          </Field>

          <Field
            label={isNew ? "Planned features" : "Existing features"}
            helper={
              isNew
                ? "What the product will do once built."
                : "What the product already does today."
            }
            error={errors.existingFeatures}
          >
            <Textarea
              value={form.existingFeatures}
              onChange={(e) => setField("existingFeatures", e.target.value)}
              onBlur={() => handleBlur("existingFeatures")}
              placeholder={
                isNew
                  ? "Product catalog, checkout, order tracking."
                  : "User accounts, product catalog, checkout, order history."
              }
              rows={2}
              disabled={submitting}
              aria-invalid={!!errors.existingFeatures}
            />
          </Field>

          <Field
            label="Business goals"
            helper="What the product is trying to achieve."
            error={errors.businessGoals}
          >
            <Textarea
              value={form.businessGoals}
              onChange={(e) => setField("businessGoals", e.target.value)}
              onBlur={() => handleBlur("businessGoals")}
              placeholder="Increase repeat orders and reduce checkout drop-off."
              rows={2}
              disabled={submitting}
              aria-invalid={!!errors.businessGoals}
            />
          </Field>

          <Field
            label="Target users"
            helper="Who uses this product."
            error={errors.targetUsers}
          >
            <Textarea
              value={form.targetUsers}
              onChange={(e) => setField("targetUsers", e.target.value)}
              onBlur={() => handleBlur("targetUsers")}
              placeholder="Shoppers on mobile, and store staff managing fulfillment."
              rows={2}
              disabled={submitting}
              aria-invalid={!!errors.targetUsers}
            />
          </Field>
        </Section>

        <Section title="Repository">
          <Field
            label="GitHub repository"
            helper="The codebase this project ships to. You can connect GitHub later."
            error={errors.repoFullName}
          >
            <Input
              value={form.repoFullName}
              onChange={(e) => setField("repoFullName", e.target.value)}
              onBlur={() => handleBlur("repoFullName")}
              placeholder="owner/repo"
              className="font-mono"
              disabled={submitting}
              aria-invalid={!!errors.repoFullName}
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => {
                setAutoAnalyze(e.target.checked)
                autoAnalyzeRef.current = e.target.checked
              }}
              disabled={submitting}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border border-input disabled:opacity-50"
              style={{ accentColor: "hsl(var(--primary))" }}
            />
            <span className="flex flex-col">
              <span className="text-sm text-foreground">
                Analyze this repository after creating
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                Maps the codebase so feature work is grounded in real
                architecture.
              </span>
            </span>
          </label>
        </Section>

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" asChild disabled={submitting}>
            <Link href="/admin">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Creating…" : "Create project"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {intro && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {intro}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string
  helper?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
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