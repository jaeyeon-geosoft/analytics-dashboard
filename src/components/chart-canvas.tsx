import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { FileDropzone } from "@/components/file-dropzone"
import type { Dataset } from "@/components/settings-sidebar"

export type CanvasState =
  | { status: "empty" }
  | { status: "loading"; fileName: string; progress?: number }
  | { status: "error"; fileName?: string; message: string }
  | { status: "ready"; dataset: Dataset }

function CanvasFrame({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-[26rem] flex-col rounded-2xl border border-border bg-card lg:min-h-0">
      {title && (
        <header className="shrink-0 border-b border-border px-5 py-3.5">{title}</header>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </section>
  )
}

export function ChartCanvas({
  state,
  onFile,
}: {
  state: CanvasState
  onFile: (file: File) => void
}) {
  if (state.status === "empty") {
    return (
      <CanvasFrame>
        <FileDropzone onFile={onFile} className="h-full flex-1 justify-center border-0" />
      </CanvasFrame>
    )
  }

  if (state.status === "loading") {
    return (
      <CanvasFrame
        title={
          <>
            <p className="font-mono text-sm">{state.fileName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">읽는 중…</p>
          </>
        }
      >
        <Progress value={state.progress} className="mb-6 h-1" />
        <div className="flex min-h-0 flex-1 items-center">
          <div className="flex h-44 w-full items-end gap-3 border-b border-l border-border">
            {[68, 42, 88, 55, 74, 36, 61].map((height, index) => (
              <Skeleton
                key={index}
                className="flex-1 rounded-none rounded-t-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </CanvasFrame>
    )
  }

  if (state.status === "error") {
    return (
      <CanvasFrame>
        <Alert variant="destructive" className="mb-5">
          <AlertTriangle />
          <AlertTitle>파일을 열지 못했습니다</AlertTitle>
          <AlertDescription>
            {state.fileName && <span className="font-mono">{state.fileName}</span>}
            {state.fileName && " — "}
            {state.message}
          </AlertDescription>
        </Alert>
        <FileDropzone onFile={onFile} className="flex-1 justify-center" />
      </CanvasFrame>
    )
  }

  return (
    <CanvasFrame
      title={
        <>
          <p className="font-mono text-sm">{state.dataset.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            왼쪽에서 차트 종류와 축을 고르세요.
          </p>
        </>
      }
    >
      {/* 플롯 영역. 축선만 세워두고, 마크는 데이터가 연결되면 여기에 그린다. */}
      <div className="relative min-h-64 flex-1 border-b border-l border-border">
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          축을 고르면 차트가 그려집니다.
        </p>
      </div>
    </CanvasFrame>
  )
}
