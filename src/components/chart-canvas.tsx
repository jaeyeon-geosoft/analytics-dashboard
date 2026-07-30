import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

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
  type ChartFrame,
  type ScatterFrame,
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
  const frameRef = useRef(0)
  const { data } = state

  /*
    집계와 Recharts 렌더는 둘 다 동기라서, 범주가 만 개쯤 되면 그동안 화면이 통째로
    멈춘다. 계산을 상태로 미뤄서 "그리는 중"이 먼저 찍히게 한다. rAF 한 번으로는 같은
    프레임에 묶여 안 보이므로 두 번 양보한다.
  */
  const [built, setBuilt] = useState<{
    frame: ChartFrame | null
    scatter: ScatterFrame | null
  } | null>(null)
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    setBusy(true)
    let cancelled = false
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => {
        if (cancelled) return
        setBuilt({
          frame:
            chartType === "scatter"
              ? null
              : buildChartFrame(chartType, mapping, aggregation, columns, data.rows),
          scatter: chartType === "scatter" ? buildScatterFrame(mapping, data.rows) : null,
        })
        setBusy(false)
      })
      frameRef.current = inner
    })
    frameRef.current = outer
    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
    }
  }, [chartType, mapping, aggregation, columns, data.rows])

  const frame = built?.frame ?? null
  const scatter = built?.scatter ?? null

  const missing = MAPPING_SLOTS[chartType]
    .filter((slot) => !slot.optional && !mapping[slot.key])
    .map((slot) => slot.label)

  const caveats = [
    data.truncated && `상한 ${MAX_ROWS.toLocaleString()}행까지만 읽었습니다.`,
    data.errorCount > 0 && `${data.errorCount.toLocaleString()}개 행이 헤더와 모양이 달랐습니다.`,
    frame &&
      frame.folded > 0 &&
      `조각이 많아 나머지 ${frame.folded}개 범주는 "기타"로 묶었습니다.`,
    // 자르지 않고 전부 그리므로 화면 밖으로 넘어간다. 어디를 봐야 하는지 알려준다.
    frame && frame.folded === 0 && frame.rows.length > 40 &&
      `범주 ${frame.rows.length.toLocaleString()}개를 전부 그렸습니다. 가로로 밀어 보거나 표 보기를 쓰세요.`,
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
      {/*
        relative + 자식 absolute로 채운다. flex-1은 높이가 auto라서 자식의 h-full(백분율)이
        해석되지 못하고 콘텐츠 높이로 무너진다 — Recharts가 47px짜리 플롯을 그렸다.
      */}
      <div className="relative min-h-64 flex-1">
        {/* 계산 중에도 이전 차트를 남겨둔다. 비워버리면 화면이 튄다. */}
        <div className={busy ? "pointer-events-none h-full opacity-40" : "h-full"}>
          {!drawable ? (
            !busy && (
              <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {missing.length > 0
                  ? `${missing.join(", ")}을(를) 고르면 차트가 그려집니다.`
                  : "고른 컬럼으로 그릴 수 있는 값이 없습니다. 컬럼 타입을 확인해 주세요."}
              </p>
            )
          ) : view === "chart" ? (
            <ChartView chartType={chartType} frame={frame} scatter={scatter} />
          ) : (
            <DataTable frame={frame} scatter={scatter} />
          )}
        </div>
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground shadow-sm">
              <Loader2 className="size-3.5 animate-spin" />
              차트를 그리는 중…
            </p>
          </div>
        )}
      </div>
    </CanvasFrame>
  )
}
