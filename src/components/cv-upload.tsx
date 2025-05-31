'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  SUPPORTED_FILE_TYPES, 
  MAX_FILE_SIZE, 
  validateFile
} from '@/lib/file-utils'
import { cn, formatFileSize } from '@/lib/utils'

interface CVUploadProps {
  onFileSelect: (file: File) => void
  isUploading?: boolean
  className?: string
}

export function CVUpload({ onFileSelect, isUploading, className }: CVUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError('')
    
    if (acceptedFiles.length === 0) {
      return
    }

    const file = acceptedFiles[0]
    const validation = validateFile(file)
    
    if (!validation.valid) {
      setError(validation.error || 'ファイルが無効です')
      return
    }

    setSelectedFile(file)
    onFileSelect(file)
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FILE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: isUploading,
  })

  const removeFile = () => {
    setSelectedFile(null)
    setError('')
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? "ここにファイルをドロップ"
                : "クリックまたはドラッグ&ドロップでCVをアップロード"}
            </p>
            <p className="text-sm text-muted-foreground">
              PDF、DOCX、またはLinkedIn JSON形式（最大5MB）
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
