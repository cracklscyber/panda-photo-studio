'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface ImageUploadProps {
  onImageUpload: (imageData: string) => void
}

export default function ImageUpload({ onImageUpload }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        onImageUpload(result)
      }
      reader.readAsDataURL(file)
    }
  }, [onImageUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <button
        type="button"
        className={`p-2 rounded-full transition-colors ${
          isDragActive
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Bild hochladen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </button>
    </div>
  )
}
