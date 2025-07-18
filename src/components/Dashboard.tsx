"use client"

import { useState } from "react"

import FileIcon from "./FileIcon"
import { trpc } from "@/app/_trpc/client"
import { Ghost, Loader2, MessageSquare, Trash, Plus, ChevronUp, ChevronDown } from "lucide-react"
import Skeleton from "react-loading-skeleton"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "./ui/button"

const Dashboard = () => {
  const [currentlyDeletingFile, setCurrentlyDeletingFile] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: files, isLoading } = trpc.getUserFiles.useQuery()

  const { mutate: deleteFile } = trpc.deleteFile.useMutation({
    onMutate: ({ id }) => setCurrentlyDeletingFile(id),
    onSuccess: () => utils.getUserFiles.invalidate(),
    onSettled: () => setCurrentlyDeletingFile(null),
  })

  const { mutate: moveFile } = trpc.updateFilePosition.useMutation({
    onSuccess: () => utils.getUserFiles.invalidate(),
  })

  return (
    <main className="mx-auto max-w-7xl p-6 mt-4">
      {/* Main Content Area */}
      <div className="mb-16 flex items-end justify-between">
        <div className="flex-1"></div>
        <h1 
          className="font-normal text-gray-900 flex-1 text-center" 
          style={{ 
            fontFamily: '"source-serif-pro", serif',
            fontSize: '4rem',
            lineHeight: '1'
          }}
        >
          My Files
        </h1>

        <div className="flex-1 flex justify-end">
          <Button 
            variant="ghost"
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 h-auto"
            style={{ fontFamily: '"source-serif-pro", serif' }}
          >
            <span className="text-2xl font-normal">sort</span>
            <ChevronDown className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Files Container */}
      {files && files.length ? (
        <div className="relative min-h-[60vh] w-full">
          {files
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((file) => (
              <FileIcon
                key={file.id}
                file={file}
                onMove={(id, x, y) => moveFile({id, x, y})}
                onDelete={(id) => deleteFile({id})}
              />
            ))}
        </div>
      ) : isLoading ? (
        <div className="flex justify-center">
          <Skeleton height={100} className="my-2" count={3} />
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-2">
          <Ghost className="h-8 w-8 text-zinc-800" />
          <h3 className="text-xl font-semibold">Pretty empty around here</h3>
          <p>Let&apos;s upload your first PDF</p>
        </div>
      )}
    </main>
  )
}

export default Dashboard
