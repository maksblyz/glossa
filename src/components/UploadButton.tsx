"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { DialogContent, Dialog, DialogTrigger, DialogHeader, DialogTitle} from "./ui/dialog"

import Dropzone from "react-dropzone"
import { Cloud, File } from "lucide-react"
import { Progress } from "./ui/progress"

import { upload } from "@vercel/blob/client"
import { trpc } from "@/app/_trpc/client"

const UploadDropzone = () => {

    const router = useRouter();
    const utils = trpc.useUtils();
    const [isUploading, setIsUploading] = useState<boolean>(false)
    const [uploadProgress, setUploadProgress] = useState<number>(0)

    const startSimulatedProgress = () => {
        setUploadProgress(0) 

        const interval = setInterval(() => {
            setUploadProgress((prevProgress) => {
                if(prevProgress >= 95) {
                    clearInterval(interval)
                    return prevProgress
                }
                return prevProgress + 5
            })
        }, 500)

        return interval
    }

    return <Dropzone multiple = {false} onDrop={ async (accepted) => { 
        const file = accepted[0]
        setIsUploading(true);
        const progressInterval = startSimulatedProgress()

        //handle file uploading
        try {
            const blob = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/blob/upload',
                onUploadProgress: (p) => setUploadProgress(p.percentage),
            });
            clearInterval(progressInterval)
            setUploadProgress(100)
            
            // Invalidate the files query to refresh the dashboard
            utils.getUserFiles.invalidate()
            
            // redirect to the viewer page
            const filename = encodeURIComponent(blob.pathname ?? blob.url.split('/').pop()!);
            router.push(`/pdf/${filename}`);
        } catch (e) {
            console.error(e)
            clearInterval(progressInterval)
        } finally {
            setIsUploading(false)
        }
    }}>
        {({getRootProps, getInputProps, acceptedFiles}) =>  (
            <div 
                {...getRootProps({})} 
                className='border h-64 m-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center'>
                <div className="flex items-center justify-center h-full w-full">
                    <label
                        htmlFor='dropzone-file'
                        className="flex flex-col items-center w-full h-full rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <input {...getInputProps()} id="dropzone-file" className="hidden" />
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Cloud className='h-6 w-6 tezt-zinc-500 mb-2'/>
                                <p className="mb-2 text-sm text-zinc-700">
                                    <span className="font-semibold">Click to upload </span>
                                    or drag and drop
                                </p>
                                <p className="text-xs text-zinc-500">PDF (up to 5MB)</p>
                            </div>
                            {acceptedFiles && acceptedFiles[0] ? (
                                <div className="max-w-xs bg-white flex items-center rounded-md overflow-hidden outline-[1px] outline-zinc-200 divide-x divide-zinc-200">
                                    <div className="px-3 py-2 h-full grid place-items-center">
                                        <File className='h-4 w-4 text-blue-500'/>
                                    </div>
                                    <div className='px-3 py-2 h-full text-sm truncate'>
                                        {acceptedFiles[0].name}
                                    </div>
                                </div>
                            ): null}
                            {isUploading ? (
                                <div className="w-full mt-4 max-w-xs mx-auto">
                                    <Progress value={uploadProgress} className='h-1 w-full bg-zinc0-200'/>
                                </div>
                            ) : null}
                    </label>
                </div>
            </div>
        )}
    </Dropzone>
}

const UploadButton = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false)

    return (
        <Dialog 
        open={isOpen}
        onOpenChange={(v) => {
            if(!v) {
                setIsOpen(v)
            }
        }}>
            <DialogTrigger onClick= {()=> setIsOpen(true)} asChild>
                <Button 
                    style={{ 
                        fontFamily: '"source-serif-pro", serif',
                        fontSize: '19px',
                        paddingLeft: '32px',
                        paddingRight: '32px',
                        height: '48px'
                    }}
                >
                    Upload PDF
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="sr-only">Upload PDF</DialogTitle>
                </DialogHeader>
                
                <UploadDropzone/>
            </DialogContent>
        </Dialog>
    )

}

export default UploadButton