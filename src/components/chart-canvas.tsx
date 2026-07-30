import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { FileDropzone } from "@/components/file-dropzone"
import type { Dataset } from "@/components/settings-sidebar"
import { MAX_ROWS, type ParsedFile } from "@/lib/parse-file"

export type CanvasState =
  | { status: "empty" }
  | { status: "loading"; fileName: string }
  | { status: "error"; fileName?: string; message: string }
  | { status: "ready"; dataset: Dataset; data: ParsedFile }

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

  const { data } = state
  const caveats = [
    data.truncated && `상한 ${MAX_ROWS.toLocaleString()}행까지만 읽었습니다.`,
    data.errorCount > 0 && `${data.errorCount.toLocaleString()}개 행이 헤더와 모양이 달랐습니다.`,
  ].filter(Boolean)

  return (
    <CanvasFrame
      title={
        <>
          <p className="font-mono text-sm">{state.dataset.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {data.rows.length.toLocaleString()}행 · {data.columns.length}개 컬럼
          </p>
          {caveats.length > 0 && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>{caveats.join(" ")}</span>
            </p>
          )}
        </>
      }
    >
      {/* 플롯 영역. 축선만 세워두고, 마크는 매핑이 연결되면 여기에 그린다. */}
      <div className="relative min-h-64 flex-1 border-b border-l border-border">
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          왼쪽에서 차트 종류와 컬럼을 고르세요.
        </p>
      </div>
    </CanvasFrame>
  )
}
