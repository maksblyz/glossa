import { db } from "@/db"
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
import { notFound, redirect } from "next/navigation"
import { KindeUser } from "@kinde-oss/kinde-auth-nextjs"

export default async function Page({ params }: { params: { fileid: string } }) {
    const { fileid } = params
    const { getUser } = getKindeServerSession()
    const rawUser = await getUser()
    const user = rawUser as KindeUser | null

    if(!user?.id) redirect(`/auth-callback?origin=dashboard/${fileid}`)

    // Get the file from database
    const file = await db.file.findFirst({
        where: { id: fileid, userId: user!.id }
    })
    
    if(!file) notFound()
    
    // Redirect to the PDF viewer with the file key
    redirect(`/pdf/${encodeURIComponent(file.key)}`)
}
