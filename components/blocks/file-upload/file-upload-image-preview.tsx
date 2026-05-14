"use client"

import { ImageIcon, PlusIcon, XIcon } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface UploadedImage {
  id: string
  name: string
  size: string
}

const MAX_FILES = 8

const initialImages: UploadedImage[] = [
  { id: "1", name: "hero-banner.jpg", size: "2.1 MB" },
  { id: "2", name: "product-shot.png", size: "1.4 MB" },
  { id: "3", name: "team-photo.jpg", size: "3.8 MB" },
  { id: "4", name: "office-interior.png", size: "2.7 MB" },
]

export default function FileUploadImagePreview() {
  const [images, setImages] = useState<UploadedImage[]>(initialImages)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImages = (fileList: FileList) => {
    const remaining = MAX_FILES - images.length
    const newImages: UploadedImage[] = Array.from(fileList)
      .slice(0, remaining)
      .map((file, i) => {
        const sizeStr =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(0)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        return {
          id: `new-${images.length + i}`,
          name: file.name,
          size: sizeStr,
        }
      })
    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  const canAddMore = images.length < MAX_FILES

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <span className="font-medium text-sm">Images</span>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {images.length} of {MAX_FILES} images uploaded
            </p>
          </div>
          <span className="text-muted-foreground text-xs">JPG, PNG, WebP</span>
        </div>

        {/* Image grid */}
        <div className="border-b px-4 py-4">
          <div className="grid grid-cols-4 gap-2">
            {images.map(image => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-md bg-muted/50"
                onMouseEnter={() => setHoveredId(image.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="size-6 text-muted-foreground/40" />
                </div>

                {/* Hover overlay */}
                {hoveredId === image.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeImage(image.id)}
                      className="text-white hover:bg-white/20 hover:text-white"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                )}

                {/* File name tooltip */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4">
                  <span className="block truncate text-white text-[10px]">{image.name}</span>
                </div>
              </div>
            ))}

            {/* Add more button */}
            {canAddMore && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
                }}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
              >
                <PlusIcon className="size-5 text-muted-foreground/50" />
                <span className="text-muted-foreground text-[10px]">Add</span>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) addImages(e.target.files)
              e.target.value = ""
            }}
          />
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-muted-foreground text-xs">
            {canAddMore
              ? `${MAX_FILES - images.length} more ${MAX_FILES - images.length === 1 ? "slot" : "slots"} available`
              : "Maximum images reached"}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Upload all
          </Button>
        </div>
      </div>
    </section>
  )
}
