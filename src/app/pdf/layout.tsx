import Header from "@/components/Header"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"

export default async function PDFLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { getUser } = getKindeServerSession()
  const user = await getUser()

  return (
    <>
      <Header user={user} />
      {children}
    </>
  )
} 