"use client"

import { PropsWithChildren, useState } from "react"
import { QueryClient } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { trpc } from "@/app/_trpc/client"

const Providers = ({children} : PropsWithChildren) => {
    const [queryClient] = useState(() => new QueryClient)
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: 'http://localhost:3000/api/trpc',
                })
            ],
        })
    )
    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {children}
        </trpc.Provider>
    )
}

export default Providers