import { requireRole } from "@/lib/auth-guard"

export default async function DevLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole("DEVELOPER")
  return <>{children}</>
}
