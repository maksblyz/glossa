"use client"

import Link from 'next/link'
import { useState } from 'react'
import type { KindeUser } from '@kinde-oss/kinde-auth-nextjs'

export default function Header ({ user }: { user?: KindeUser }){
    const[mode, setMode] = useState('PHD') //stash in cookie later
    return (
        <header className='sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-white px-4'>
            {/* logo */}
            <Link href='/dashboard' className='font-semibold'>glossa</Link>

            {/* right = mode + profile */}
            <div className = 'flex items-center gap-3'>
                <select
                    value= {mode}
                    onChange={e => setMode(e.target.value)}
                    className='rounded border px-2 py-1 text-sm'
                >
                    <option>PhD</option>
                    <option>Masters</option>
                    <option>Bachelors</option>
                    <option>HS</option>
                    <option>MS</option>
                </select>

                <div className="flex h-7 w-7 items-center justify-center rounded-2xl bg-blue-500 text-sm font-semibold text-white">
                    {user?.given_name?.[0]?.toUpperCase() ?? 'U'}
                </div>

            </div>
        </header>
    )
}