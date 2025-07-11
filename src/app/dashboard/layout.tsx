import DashboardHeader from "@/components/DashboardHeader"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  return (
    <>
      <DashboardHeader user={user} />
      {children}
    </>
  )
} 