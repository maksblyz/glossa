import { AppRouter } from "@/trpc"
import { createTRPCReact, httpBatchLink } from"@trpc/react-query"


export const trpc = createTRPCReact<AppRouter>({})

// function getBaseUrl(){
//     // browser: use current origin
//     if (typeof window !== 'undefined') return '';
//     // vercel prod
//     if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
//     //dev
//     return 'http://localhost:3000';
// }

// export const trpc = createTRPCReact<AppRouter>({
//     links: [
//         httpBatchLink({
//             url: `${getBaseUrl()}/api/trpc`,
//         }),
//     ],
// })

