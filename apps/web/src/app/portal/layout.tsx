import { requireRole } from "@/lib/auth-guard"

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole("CLIENT")
  return <>{children}</>
}