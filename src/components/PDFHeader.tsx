"use client"

import Link from 'next/link'
import type { KindeUser } from '@kinde-oss/kinde-auth-nextjs'

export default function PDFHeader({ user }: { user?: KindeUser<Record<string, any>> | null }) {
  return (
    <nav 
      className='sticky inset-x-0 top-0 z-30 w-full transition-all border-b border-gray-200'
      style={{ 
        height: '88px',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div className="mx-auto w-full max-w-screen-xl px-2.5 md:px-20">
        <div 
          className="flex items-center justify-between"
          style={{ height: '88px' }}
        >
          <Link 
            href='/dashboard' 
            className="flex z-40 items-center">
            <span 
              className="text-4xl font-normal" 
              style={{ fontFamily: '"source-serif-pro", serif' }}
            >
              Glossa.
            </span>
          </Link>

          <div className="flex items-center">
            {/* profile icon */}
            <div 
              className="flex items-center justify-center text-white"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                fontSize: '18px',
                fontFamily: '"source-serif-pro", serif',
                fontWeight: 'normal',
                backgroundColor: '#2563eb'
              }}
            >
              {user?.given_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 