import { prisma } from "@shipflow/db"

const dev = await prisma.user.findFirst({
  where: { name: "dev" },
  select: { id: true, name: true, email: true },
})
console.log("DEV USER:", dev)

if (dev) {
  const pm = await prisma.projectMember.findMany({
    where: { userId: dev.id },
    select: { role: true, project: { select: { name: true } } },
  })
  console.log("PROJECT MEMBERSHIPS:", JSON.stringify(pm, null, 2))

  const ws = await prisma.membership.findMany({
    where: { userId: dev.id },
    select: { role: true, workspace: { select: { name: true } } },
  })
  console.log("WORKSPACE MEMBERSHIPS:", JSON.stringify(ws, null, 2))
}

const inDev = await prisma.featureRequest.findMany({
  where: { status: "IN_DEV" },
  select: {
    title: true,
    project: { select: { name: true } },
    prd: { select: { _count: { select: { tasks: true } } } },
  },
})
console.log("IN_DEV REQUESTS:", JSON.stringify(inDev, null, 2))

process.exit(0)
