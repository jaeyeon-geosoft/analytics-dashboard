import { useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FileDropzone } from "@/components/file-dropzone"
import { ChartView } from "@/components/chart-view"
import { DataTable } from "@/components/data-table"
import type { ChartType } from "@/components/chart-type-picker"
import type { Dataset } from "@/components/settings-sidebar"
import {
  AGGREGATION_LABELS,
  buildChartFrame,
  buildScatterFrame,
  type Aggregation,
} from "@/lib/aggregate"
import type { ColumnInfo } from "@/lib/infer-types"
import { MAPPING_SLOTS, type Mapping } from "@/lib/mapping-slots"
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
  chartType,
  mapping,
  aggregation,
  columns,
  onFile,
}: {
  state: CanvasState
  chartType: ChartType
  mapping: Mapping
  aggregation: Aggregation
  columns: ColumnInfo[]
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

  return (
    <ReadyCanvas
      state={state}
      chartType={chartType}
      mapping={mapping}
      aggregation={aggregation}
      columns={columns}
    />
  )
}

function ReadyCanvas({
  state,
  chartType,
  mapping,
  aggregation,
  columns,
}: {
  state: Extract<CanvasState, { status: "ready" }>
  chartType: ChartType
  mapping: Mapping
  aggregation: Aggregation
  columns: ColumnInfo[]
}) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const { data } = state

  const frame = useMemo(
    () =>
      chartType === "scatter"
        ? null
        : buildChartFrame(chartType, mapping, aggregation, columns, data.rows),
    [chartType, mapping, aggregation, columns, data.rows]
  )
  const scatter = useMemo(
    () => (chartType === "scatter" ? buildScatterFrame(mapping, data.rows) : null),
    [chartType, mapping, data.rows]
  )

  const missing = MAPPING_SLOTS[chartType]
    .filter((slot) => !slot.optional && !mapping[slot.key])
    .map((slot) => slot.label)

  const caveats = [
    data.truncated && `상한 ${MAX_ROWS.toLocaleString()}행까지만 읽었습니다.`,
    data.errorCount > 0 && `${data.errorCount.toLocaleString()}개 행이 헤더와 모양이 달랐습니다.`,
    frame && frame.omitted > 0 && `상위 ${frame.rows.length}개만 그렸습니다 (${frame.omitted}개 생략).`,
    scatter && scatter.omitted > 0 && `점 ${scatter.omitted.toLocaleString()}개는 그리지 않았습니다.`,
  ].filter(Boolean)

  const drawable = Boolean(frame ?? scatter)

  return (
    <CanvasFrame
      title={
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm" title={state.dataset.name}>
              {state.dataset.name}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {data.rows.length.toLocaleString()}행 · {data.columns.length}개 컬럼
              {chartType !== "scatter" && ` · ${AGGREGATION_LABELS[aggregation]}`}
            </p>
            {caveats.length > 0 && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-px size-3.5 shrink-0" />
                <span>{caveats.join(" ")}</span>
              </p>
            )}
          </div>
          {drawable && (
            <ToggleGroup
              type="single"
              variant="outline"
              value={view}
              onValueChange={(next) => next && setView(next as "chart" | "table")}
              spacing={0}
              className="shrink-0"
            >
              <ToggleGroupItem value="chart" size="sm" className="text-xs">
                차트
              </ToggleGroupItem>
              <ToggleGroupItem value="table" size="sm" className="text-xs">
                표
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      }
    >
      <div className="min-h-64 flex-1">
        {!drawable ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {missing.length > 0
              ? `${missing.join(", ")}을(를) 고르면 차트가 그려집니다.`
              : "고른 컬럼으로 그릴 수 있는 값이 없습니다. 컬럼 타입을 확인해 주세요."}
          </p>
        ) : view === "chart" ? (
          <ChartView chartType={chartType} frame={frame} scatter={scatter} />
        ) : (
          <DataTable frame={frame} scatter={scatter} />
        )}
      </div>
    </CanvasFrame>
  )
}
