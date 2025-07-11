"use client"

import MaxWidthWrapper from "./MaxWidthWrapper"
import Link from 'next/link'
import type { KindeUser } from '@kinde-oss/kinde-auth-nextjs'

export default function DashboardHeader({ user }: { user?: KindeUser<Record<string, any>> | null }) {
  return (
    <nav className='sticky h-14 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all'>
      <MaxWidthWrapper>
        <div className="flex h-14 items-center justify-between border-b border-zinc-200">
          <Link 
            href='/dashboard' 
            className="flex z-40 font-semibold">
            <span>Glossa</span>
          </Link>

          {/* profile icon */}
          <div className="flex h-7 w-7 items-center justify-center rounded-2xl bg-blue-500 text-sm font-semibold text-white">
            {user?.given_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </MaxWidthWrapper>
    </nav>
  )
} 