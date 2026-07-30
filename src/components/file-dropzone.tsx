import { useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ACCEPTED_EXTENSIONS, ACCEPT_ATTR, MAX_FILE_BYTES, formatBytes } from "@/lib/file-constraints"

export function FileDropzone({
  onFile,
  className,
}: {
  onFile: (file: File) => void
  className?: string
}) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center transition-colors",
        isDragging && "border-chart-1 bg-chart-1/5",
        className
      )}
    >
      <div
        className={cn(
          "mb-5 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors",
          isDragging && "bg-chart-1/15 text-chart-1"
        )}
      >
        <Upload className="size-5" />
      </div>

      <p className="text-[15px] font-medium text-foreground">
        {isDragging ? "여기에 놓으세요" : "표를 차트로 봅니다"}
      </p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        CSV나 Excel 파일을 이 영역에 끌어다 놓으세요.
      </p>

      <Button asChild variant="outline" size="sm" className="mt-5">
        <label className="cursor-pointer">
          파일 선택
          <input
            type="file"
            accept={ACCEPT_ATTR}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(file)
              event.target.value = ""
            }}
          />
        </label>
      </Button>

      <p className="mt-6 font-mono text-[11px] text-muted-foreground/80">
        {ACCEPTED_EXTENSIONS.join(" · ")} — 최대 {formatBytes(MAX_FILE_BYTES)}
      </p>
    </div>
  )
}
