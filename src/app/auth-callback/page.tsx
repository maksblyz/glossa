import { useRouter, useSearchParams } from "next/navigation"
import { trpc } from '../_trpc/client'
import { useEffect } from "react";


export default function Page(){
    const router = useRouter();
    const searchParams = useSearchParams();
    const originParam = searchParams.get('origin');

    const { data, isSuccess } = trpc.authCallback.useQuery();

    useEffect(() => {
        if (isSuccess && data?.success) {
            router.push(originParam ? '/${originParam}' : '/dashboard');
        }
    }, [isSuccess, data, originParam, router]);

    return null;
}