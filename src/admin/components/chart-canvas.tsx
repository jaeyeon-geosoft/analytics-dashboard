import { AlertTriangle, Download, Plus } from "lucide-react"
import GridLayout, { useContainerWidth, type Layout } from "react-grid-layout"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { FileDropzone } from "@/admin/components/file-dropzone"
import { ChartCard } from "@/shared/components/chart-card"
import type { CanvasState, Dataset } from "@/admin/lib/canvas-state"
import { MAX_CHARTS, type ChartSpec } from "@/shared/lib/chart-spec"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { syncLayout } from "@/admin/lib/chart-layout"
import { GRID_COLS, GRID_MARGIN, GRID_ROW_HEIGHT } from "@/shared/lib/dashboard"
import { MAX_ROWS, type ParsedFile } from "@/admin/lib/parse-file"

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
  onExport,
  onFile,
  layout,
  onLayoutChange,
}: {
  state: CanvasState
  charts: ChartSpec[]
  activeId: string
  columns: ColumnInfo[]
  onSelectChart: (id: string) => void
  onAddChart: () => void
  onExport: () => void
  layout: Layout
  onLayoutChange: (next: Layout) => void
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
        onExport={onExport}
      />
      {/*
        스크롤은 이 바깥 상자가 맡고, 폭을 재는 상자는 그 안이다. 스크롤바 자리를
        미리 비워둬야(`scrollbar-gutter`) 스크롤바가 생겼다 사라질 때 폭이 15px
        진동하지 않는다 — 진동하면 재측정이 되먹임에 빠진다(CLAUDE.md).
      */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <ChartGrid
          charts={charts}
          layout={layout}
          onLayoutChange={onLayoutChange}
          activeId={activeId}
          columns={columns}
          data={state.data}
          single={single}
          onSelectChart={onSelectChart}
          onRemoveChart={onRemoveChart}
        />
      </div>
    </div>
  )
}

/**
 * 카드를 끌어 옮기고 크기를 늘리는 격자. 여기서 정한 배치가 그대로 내보내지고
 * 뷰어가 같은 자리에 그린다 — 그래서 칸 규격(`GRID_*`)을 shared에서 가져온다.
 */
function ChartGrid({
  charts,
  layout,
  onLayoutChange,
  activeId,
  columns,
  data,
  single,
  onSelectChart,
  onRemoveChart,
}: {
  charts: ChartSpec[]
  layout: Layout
  onLayoutChange: (next: Layout) => void
  activeId: string
  columns: ColumnInfo[]
  data: ParsedFile
  single: boolean
  onSelectChart: (id: string) => void
  onRemoveChart: (id: string) => void
}) {
  const { width, containerRef, mounted } = useContainerWidth()
  // 카드가 늘거나 줄면 배치가 어긋난다. 넘기기 직전에 한 번 맞춘다.
  const settled = syncLayout(charts.map((spec) => spec.id), layout)

  return (
    <div ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          layout={settled}
          onLayoutChange={onLayoutChange}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: GRID_ROW_HEIGHT,
            margin: [GRID_MARGIN, GRID_MARGIN],
            containerPadding: [0, 0],
          }}
          // 카드 안의 버튼·토글을 누르는 것은 드래그가 아니다. 차트 위를 끄는 것은
          // 드래그가 맞다 — Recharts의 크로스헤어는 버튼을 누르지 않은 이동에만 반응한다.
          dragConfig={{ cancel: "button,[role=radiogroup]" }}
        >
          {charts.map((spec, index) => (
            // `grid`라 안의 카드가 rgl이 정해준 칸을 그대로 채운다.
            <div key={spec.id} className="grid">
              <ChartCard
                spec={spec}
                number={index + 1}
                order={index}
                data={data}
                columns={columns}
                selected={spec.id === activeId}
                onSelect={() => onSelectChart(spec.id)}
                onRemove={single ? undefined : () => onRemoveChart(spec.id)}
              />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  )
}

/** 파일 단위 정보와 경고. 카드마다 반복하면 같은 문장을 네 번 읽게 된다. */
function DatasetBar({
  dataset,
  data,
  count,
  onAddChart,
  onExport,
}: {
  dataset: Dataset
  data: ParsedFile
  count: number
  onAddChart: () => void
  onExport: () => void
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
        {/* API가 붙기 전까지의 임시 통로. 지금 캔버스에 있는 것을 뷰어가 읽는 JSON으로
            떨군다 — 나중에 이 버튼이 "저장"(POST)이 된다. */}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download />
          내보내기
        </Button>
      </div>
    </div>
  )
}
