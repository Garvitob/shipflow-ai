import * as readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { prisma, Role } from "@shipflow/db"

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

type Inputs = {
  companyName: string
  adminName: string
  adminEmail: string
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith("--")) {
      out[key] = next
      i++
    } else {
      out[key] = "true"
    }
  }
  return out
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function collectInputs(): Promise<Inputs> {
  const args = parseArgs(process.argv.slice(2))
  const rl = readline.createInterface({ input: stdin, output: stdout })

  const ask = async (label: string, preset?: string) =>
    preset ? preset : (await rl.question(label)).trim()

  try {
    const companyName = await ask("  Company name: ", args.name)
    const adminName = await ask("  Admin full name: ", args.admin)
    const adminEmail = (await ask("  Admin email: ", args.email)).toLowerCase()
    return { companyName, adminName, adminEmail }
  } finally {
    rl.close()
  }
}

function validate({ companyName, adminName, adminEmail }: Inputs): string | null {
  if (!companyName) return "Company name is required."
  if (!adminName) return "Admin full name is required."
  if (!isValidEmail(adminEmail)) return "A valid admin email is required."
  return null
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "workspace"
  let slug = root
  let n = 1
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    n++
    slug = `${root}-${n}`
  }
  return slug
}

async function sendSetPasswordLink(email: string): Promise<void> {
  const res = await fetch(`${APP_URL}/api/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirectTo: `${APP_URL}/reset-password` }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `Set-password link could not be sent (HTTP ${res.status}). Ensure the app is running, then re-trigger via forgot-password. ${detail}`
    )
  }
}

async function main() {
  console.log("\n  ShipFlow — provision a new company\n")

  const inputs = await collectInputs()
  const invalid = validate(inputs)
  if (invalid) {
    console.error(`\n  ${invalid}\n`)
    process.exit(1)
  }

  const { companyName, adminName, adminEmail } = inputs

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.error(
      `\n  ${adminEmail} already has an account. If they lost their setup link, use the forgot-password flow to issue a fresh one instead of re-provisioning.\n`
    )
    process.exit(1)
  }

  const slug = await uniqueSlug(slugify(companyName))

  const { workspace, user } = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name: companyName, slug } })
    const user = await tx.user.create({
      data: { email: adminEmail, name: adminName, emailVerified: false },
    })
    await tx.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: Role.ADMIN },
    })
    return { workspace, user }
  })

  try {
    await sendSetPasswordLink(adminEmail)
  } catch (err) {
    console.error("\n  Workspace and admin were created, but:\n")
    console.error(`  ${(err as Error).message}\n`)
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log("\n  Company provisioned\n")
  console.log(`    Company:    ${workspace.name}`)
  console.log(`    Workspace:  ${workspace.slug}`)
  console.log(`    Admin:      ${user.name} <${user.email}>`)
  console.log(`    Role:       ADMIN`)
  console.log("\n  A single-use set-password link (valid 24h) was issued to the admin.")
  console.log("  Until Resend is wired, the link is printed in the app's terminal.\n")

  await prisma.$disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error("\n  Provisioning failed:\n")
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})