"use client"

import MaxWidthWrapper from "./MaxWidthWrapper"
import Link from 'next/link'
import type { KindeUser } from '@kinde-oss/kinde-auth-nextjs'
import UploadButton from "./UploadButton"

export default function DashboardHeader({ user }: { user?: KindeUser<Record<string, any>> | null }) {
  return (
    <nav className='sticky h-28 inset-x-0 top-0 z-30 w-full transition-all pt-8 bg-white'>
      <MaxWidthWrapper>
        <div className="flex h-20 items-center justify-between">
          <Link 
            href='/dashboard' 
            className="flex z-40 items-center">
            <span 
              className="text-5xl font-normal" 
              style={{ fontFamily: '"source-serif-pro", serif' }}
            >
              Glossa.
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <UploadButton />

          {/* profile icon */}
            <div 
              className="flex items-center justify-center text-white"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                fontSize: '24px',
                fontFamily: '"source-serif-pro", serif',
                fontWeight: 'normal',
                backgroundColor: '#2563eb'
              }}
            >
            {user?.given_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </nav>
  )
} 