import { FileDropzone } from "@/admin/components/file-dropzone"
import { CanvasFrame } from "@/admin/components/chart-canvas/canvas-frame"
import { FileErrorAlert } from "@/admin/components/chart-canvas/file-error-alert"
import { ReadingSkeleton } from "@/admin/components/chart-canvas/reading-skeleton"
import { cn } from "@/shared/lib/utils"
import type { OpenState } from "@/admin/lib/canvas-state"

/** 열린 파일이 아직 없다 — 화면 전체가 파일을 여는 자리다. */
export function EmptyCanvas({
  open,
  onFile,
}: {
  open: OpenState
  onFile: (file: File) => void
}) {
  if (open.status === "loading") {
    return (
      <CanvasFrame
        title={
          <>
            <p className="font-mono text-sm">{open.fileName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">읽는 중…</p>
          </>
        }
      >
        <ReadingSkeleton />
      </CanvasFrame>
    )
  }

  const failed = open.status === "error"

  return (
    <CanvasFrame>
      <FileErrorAlert open={open} className="mb-5" />
      <FileDropzone
        onFile={onFile}
        className={cn("flex-1 justify-center", !failed && "h-full border-0")}
      />
    </CanvasFrame>
  )
}
