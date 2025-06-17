// "use client"

// import { useRouter, useSearchParams } from "next/navigation"
// import { trpc } from '../_trpc/client'
// import { useEffect, useState } from "react";
// import { Loader2 } from "lucide-react";


// const Page = () => {
//     const router = useRouter()

//     const searchParams = useSearchParams()
//     const origin = searchParams.get('origin')

//     trpc.authCallback.useQuery(undefined, {
//         onSuccess : ({ success }) => {
//             if (success) {
//                 // user is synced to db
//                 router.push(origin ? `/${origin}` : '/dashboard')
//             }
//         },
//         onError: (err) => {
//             if(err.data?.code === 'UNAUTHORIZED') {
//                 router.push('/sign-in')
//             }
//         },
//         retry:true,
//         retryDelay:500
//     })

//     return (
//         <div className="min-h-[50vh] flex items-center justify-center">
//             <div>
//                 <Loader2 className='h-8 w-8 animate-spin text-zinc-300'/>
//                 <h3 className='font-semibold text-xl'>
//                     Setting up your account...
//                 </h3>
//                 <p>You will be redirected automatically.</p>
//             </div>
//     </div>
//     )
// }
// export default Page

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '../_trpc/client';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Page() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const { data, isSuccess, isLoading, error } = trpc.authCallback.useQuery(
    undefined,
    {
      retry: (count, err) => {
        if (err?.data?.code === 'UNAUTHORIZED') return false;
        return count < 3;            // max 3 tries
      },
      retryDelay: 500,
    }
  );

  // success redirect
  useEffect(() => {
    if (isSuccess && data?.success) {
      const origin = searchParams.get('origin');
      router.push(origin ? `/${origin}` : '/dashboard');
    }
  }, [isSuccess, data?.success, searchParams, router]);

  // unauthorized redirect
  useEffect(() => {
    if (error?.data?.code === 'UNAUTHORIZED') {
      router.push('/sign-in');
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
          <h3 className="font-semibold text-xl">Setting up your account…</h3>
          <p>You will be redirected automatically.</p>
        </div>
      </div>
    );
  }

  return null;
}





// export default function Page(){
//     const router = useRouter();
//     const searchParams = useSearchParams();

//     const { data, isSuccess, isLoading, error } =
//     trpc.authCallback.useQuery(undefined, {
//         retry: true,
//         retryDelay: 500,
//     });

//     // const { data, isSuccess, isLoading, error } = trpc.authCallback.useQuery(undefined, {
//     //     retry: true,
//     //     retryDelay: 500,
//     // });

//     // redirect on success
//     useEffect(() => {
//         if(isSuccess && data?.success){
//             const origin = searchParams.get('origin');
//             router.push(origin ? `/${origin}` : '/dashboard');
//         }
//     }, [isSuccess, data?.success, searchParams, router]);

//     // redirect on unauthorized
//     useEffect(() => {
//         if (error?.data?.code === 'UNAUTHORIZED'){
//             router.push('/sign-in');
//         }
//     }, [error, router]);

//     if(isLoading){
//         return (
//             <div className="min-h-[50vh] flex items-center justify-center">
//                 <div>
//                     <Loader2 className='h-8 w-8 animate-spin text-zinc-300'/>
//                     <h3 className='font-semibold text-xl'>
//                         Setting up your account...
//                     </h3>
//                     <p>You will be redirected automatically.</p>
//                 </div>
//             </div>
//         );
//     }

//     return null;
// }