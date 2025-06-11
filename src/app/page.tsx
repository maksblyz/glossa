import MaxWidthWrapper  from "@/components/MaxWidthWrapper";
import Link from 'next/link'
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  return (
    <>
    <MaxWidthWrapper className="mb-12 mt-28 sm:mt-40 flex flex-col items-center justify-center text-center">
      <div className="mb-12 mt-28 sm:mt-40 flex flex-col items-center justify-center space-x-2 overflow-hidden rounded-full border border-gray-200 bg-white px-7 py-2 shadow-md backdrop-all hover:border-gray-300 hover:bg-white/50">
        <p className='text-sm font-semibold text-gray-700'>
          Glossa is now public!
        </p>
      </div>
      <h1 className = 'max-w-4xl text-5xl font-bold md:text-6xl lg:text-7xl'>
      Zero hassle. <span className='text-blue-600'>One click.</span>  Total clarity.
      </h1>
      <p className='mt-5 max-w-prose text-zinc sm:text-lg'>
      One upload, and your whole document talks back: zero typing, zero screenshots.
      </p>

      <Link className={buttonVariants({
        size: 'lg',
        className: "mt-5",
      })}href='/dashboard' target='_blank'>
        Try It Now <ArrowRight className= 'm1-2 h-5 w-5' />
      </Link>
    </MaxWidthWrapper>
    {/* value prop section */}
    <div>
      <div className= 'relative isolate'>
        <div 
          aria-hidden="true" 
          className='pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80'>
          <div 
            style={{
              clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            }}
            className='relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]'
          />
        </div>

        <div>
          <div className = 'mx-auto max-w-6xl px-6 lg:px-8'>
            <div className ='mt-16 flow-root sm:mt-24'>
              <div className='-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4'>
                <Image 
                  src='/dashboard-preview.jpg' 
                  alt='product preview'
                  width={1364} 
                  height={866}
                  quality= {100}
                  className='rounded-md bg-white p-2 sm:p-8 md:p-20 shadow-2xl ring-gray-900/10'
                />
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
   </>
  );
}
 