import { requireRole } from "@/lib/auth-guard"

export default async function PmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole("PM")
  return <>{children}</>
}