import { prisma } from "@shipflow/db"

const DEV_USER_ID = "cmr0u09b000055qmyva6uagwg"

const u = await prisma.user.findUnique({
  where: { id: DEV_USER_ID },
  select: { id: true, name: true, email: true },
})
console.log("THIS DEVELOPER USER:", u)

const tasks = await prisma.task.findMany({
  select: {
    title: true,
    status: true,
    prd: {
      select: {
        featureRequest: { select: { title: true, status: true } },
      },
    },
  },
})
console.log("ALL TASKS:", JSON.stringify(tasks, null, 2))

process.exit(0)
