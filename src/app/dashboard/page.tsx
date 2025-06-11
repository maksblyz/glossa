import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server"
const Page = () => {
    const { getUser} = getKindeServerSession()
    const user = getUser()

    return <div>hello</div>
}

export default Page