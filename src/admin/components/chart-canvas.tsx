import { AlertTriangle, Plus } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { FileDropzone } from "@/admin/components/file-dropzone"
import { ChartCard } from "@/shared/components/chart-card"
import type { CanvasState, Dataset } from "@/admin/lib/canvas-state"
import { MAX_CHARTS, type ChartSpec } from "@/shared/lib/chart-spec"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { MAX_ROWS, type ParsedFile } from "@/admin/lib/parse-file"
import { cn } from "@/shared/lib/utils"

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
  charts,
  activeId,
  columns,
  onSelectChart,
  onAddChart,
  onRemoveChart,
  onFile,
}: {
  state: CanvasState
  charts: ChartSpec[]
  activeId: string
  columns: ColumnInfo[]
  onSelectChart: (id: string) => void
  onAddChart: () => void
  onRemoveChart: (id: string) => void
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

  const single = charts.length === 1

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DatasetBar
        dataset={state.dataset}
        data={state.data}
        count={charts.length}
        onAddChart={onAddChart}
      />
      {/*
        `minmax(26rem, 1fr)`: 남는 높이는 행끼리 나눠 갖고(카드 2장이면 그만큼 커진다),
        모자라면 26rem에서 멈추고 그리드가 스크롤한다. 고정 높이로 두면 카드가 적을 때
        아래가 텅 빈다.

        스크롤은 그리드가 맡는다. 카드 안쪽(Recharts가 폭을 재는 상자)은 절대 스크롤하지
        않는다 — 스크롤바가 생겼다 사라지며 폭이 진동하면 무한 재측정에 빠진다.
        세로 스크롤바가 카드 폭을 흔들지 않도록 자리를 미리 비워둔다.
      */}
      <div
        className={cn(
          "grid min-h-0 flex-1 auto-rows-[minmax(26rem,1fr)] gap-3 overflow-y-auto [scrollbar-gutter:stable]",
          !single && "xl:grid-cols-2"
        )}
      >
        {charts.map((spec, index) => (
          <ChartCard
            key={spec.id}
            spec={spec}
            number={index + 1}
            order={index}
            data={state.data}
            columns={columns}
            selected={spec.id === activeId}
            onSelect={() => onSelectChart(spec.id)}
            onRemove={single ? undefined : () => onRemoveChart(spec.id)}
          />
        ))}
      </div>
    </div>
  )
}

/** 파일 단위 정보와 경고. 카드마다 반복하면 같은 문장을 네 번 읽게 된다. */
function DatasetBar({
  dataset,
  data,
  count,
  onAddChart,
}: {
  dataset: Dataset
  data: ParsedFile
  count: number
  onAddChart: () => void
}) {
  const caveats = [
    data.truncated && `상한 ${MAX_ROWS.toLocaleString()}행까지만 읽었습니다.`,
    data.errorCount > 0 && `${data.errorCount.toLocaleString()}개 행이 헤더와 모양이 달랐습니다.`,
  ].filter(Boolean)

  const full = count >= MAX_CHARTS

  return (
    <div className="flex shrink-0 items-start gap-4 rounded-2xl border border-border bg-card px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm" title={dataset.name}>
          {dataset.name}
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {data.rows.length.toLocaleString()}행 · {data.columns.length}개 컬럼
        </p>
        {caveats.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>{caveats.join(" ")}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {full && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            최대 {MAX_CHARTS}개
          </span>
        )}
        {/* 카드를 늘리는 것이 이 버튼의 일이다. 새 카드가 보고 있던 차트를 물려받는 것은
            시작점일 뿐이라 이름에 넣지 않는다. */}
        <Button variant="outline" size="sm" onClick={onAddChart} disabled={full}>
          <Plus />
          차트 추가
        </Button>
      </div>
    </div>
  )
}
