import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Plus, X } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FileDropzone } from "@/components/file-dropzone"
import { ChartView } from "@/components/chart-view"
import { DataTable } from "@/components/data-table"
import type { ChartType } from "@/components/chart-type-picker"
import type { Dataset } from "@/components/settings-sidebar"
import {
  AGGREGATION_LABELS,
  buildChartFrame,
  buildHistogramFrame,
  buildScatterFrame,
  type ChartFrame,
  type ScatterFrame,
} from "@/lib/aggregate"
import { MAX_CHARTS, type ChartSpec } from "@/lib/chart-spec"
import type { ColumnInfo } from "@/lib/infer-types"
import {
  allowsReference,
  isPointChart,
  MAPPING_SLOTS,
  rightValueColumn,
  usesAggregation,
} from "@/lib/mapping-slots"
import { MAX_ROWS, type ParsedFile } from "@/lib/parse-file"
import { cn } from "@/lib/utils"

/**
 * 계산을 시작하기 **전에** 표시를 띄울지 정한다.
 *
 * 시작한 뒤에는 판단할 수 없다 — 계산이 한 덩어리로 메인스레드를 잡아서 그 사이엔
 * 타이머도 안 돈다. "느려지면 그때 띄우자"가 성립하지 않는다.
 *
 * 비용은 거의 전부 **그릴 마크 수**다. 막대·선·영역은 창에 들어가는 만큼(수십 개)만
 * 그려서 늘 빠르다(범주 66,793개 재계산이 87ms). 산점도만 점을 창으로 줄이지 않고
 * 그대로 그려서 유일하게 느리다 — 점 3,000개에 389ms, dev 빌드에서는 그 몇 배다.
 *
 * 빠른데 띄우면 오히려 고장 나 보인다. 가상화 전 막대 차트에서 표시가 66ms만 떠
 * 있었는데, 1초에 한 바퀴 도는 스피너는 그동안 24도밖에 못 돌아 멈춘 것처럼 보였다.
 */
const SLOW_POINTS = 1_500

function looksSlow(chartType: ChartType, rows: number): boolean {
  return isPointChart(chartType) && rows > SLOW_POINTS
}

type View = "chart" | "table"

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

/**
 * 카드가 무엇을 그리고 있는지 한 줄로. 네 장이 나란히 서면 종류만으로는 구분이 안 된다.
 * 분할과 오른쪽 축은 X→Y의 흐름이 아니므로 화살표에 끼우지 않고 뒤에 덧붙인다.
 */
function describe(spec: ChartSpec): { axes: string; aside?: string } {
  const slots = MAPPING_SLOTS[spec.chartType]
  const axes = slots
    .filter((slot) => slot.key !== "series" && slot.key !== "y2")
    .map((slot) => spec.mapping[slot.key])
    .filter(Boolean)
    .join(" → ")

  const right = rightValueColumn(spec.chartType, spec.mapping, spec.aggregation === "count")
  const hasSeries = slots.some((slot) => slot.key === "series")
  const aside = [
    right && `${right}(우)`,
    hasSeries ? spec.mapping.series : undefined,
  ].filter(Boolean)

  return { axes, aside: aside.length > 0 ? aside.join(" · ") : undefined }
}

function ChartCard({
  spec,
  number,
  order,
  data,
  columns,
  selected,
  onSelect,
  onRemove,
}: {
  spec: ChartSpec
  number: number
  /** 그리드에서의 순번. 카드끼리 계산이 같은 프레임에 겹치지 않게 미루는 데 쓴다. */
  order: number
  data: ParsedFile
  columns: ColumnInfo[]
  selected: boolean
  onSelect: () => void
  onRemove?: () => void
}) {
  const [view, setView] = useState<View>("chart")
  /** 표에서 차트로 돌아가는 중. 표시를 먼저 찍으려고 한 프레임 미뤄둔 상태다. */
  const [swapping, setSwapping] = useState(false)
  const frameRef = useRef(0)
  const viewFrameRef = useRef(0)
  const { chartType, mapping, aggregation, reference } = spec

  /*
    집계와 Recharts 렌더는 둘 다 동기라서, 범주가 만 개쯤 되면 그동안 화면이 통째로
    멈춘다. 계산을 상태로 미뤄서 "그리는 중"이 먼저 찍히게 한다. rAF 한 번으로는 같은
    프레임에 묶여 안 보이므로 두 번 양보한다.
  */
  // 입력 묶음의 정체성이 곧 "무엇을 그려야 하는지"다. 결과에 그 묶음을 붙여두면
  // busy를 따로 상태로 들 필요 없이 비교만으로 나온다(effect 안 동기 setState 금지).
  const request = useMemo(
    () => ({ chartType, mapping, aggregation, reference, columns, rows: data.rows }),
    [chartType, mapping, aggregation, reference, columns, data.rows]
  )
  const [built, setBuilt] = useState<{
    request: typeof request
    frame: ChartFrame | null
    scatter: ScatterFrame | null
  } | null>(null)
  const pending = built?.request !== request

  useEffect(() => {
    let cancelled = false
    // 두 번은 표시를 먼저 찍기 위한 것이고, 순번만큼 더 미루는 것은 카드끼리 계산이
    // 한 프레임에 몰리지 않게 하기 위한 것이다. 앞 카드부터 한 장씩 차례로 그려진다.
    let remaining = 2 + order
    const step = () => {
      if (cancelled) return
      if (remaining-- > 0) {
        frameRef.current = requestAnimationFrame(step)
        return
      }
      const { chartType, mapping, aggregation, reference, columns, rows } = request
      // 기준선을 못 다는 종류에서 고른 값이 남아 있어도 계산에 새어 들어가지 않게 한다.
      const wanted = allowsReference(chartType) ? reference : "none"
      setBuilt({
        request,
        frame: isPointChart(chartType)
          ? null
          : chartType === "histogram"
            ? buildHistogramFrame(mapping, rows, wanted)
            : buildChartFrame(chartType, mapping, aggregation, columns, rows, wanted),
        scatter: isPointChart(chartType) ? buildScatterFrame(mapping, rows) : null,
      })
    }
    frameRef.current = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(frameRef.current)
    }
  }, [request, order])

  const frame = built?.frame ?? null
  const scatter = built?.scatter ?? null

  /*
    보기를 바꾸는 것도 무거운 계산과 같은 자리다. 표와 막대·선·영역은 창으로 줄어서
    오가는 값이 거의 없는데, 산점도는 점을 그대로 그려서 **차트로 돌아가는 쪽**만
    commit 하나가 통째로 프레임을 넘긴다(점 3,000개 383ms, 걷어내는 쪽은 40ms).
    그래서 표로 가는 전환에는 표시를 띄우지 않는다 — 재봤을 때 72ms였고, 그 정도로
    스쳐 지나가는 스피너는 한 바퀴를 못 돌아 오히려 고장 난 것처럼 보인다.
  */
  const slow = looksSlow(chartType, data.rows.length)

  useEffect(() => {
    if (!swapping) return
    let cancelled = false
    let remaining = 2 // 한 번만 양보하면 같은 프레임에 묶여 표시가 안 보인다.
    const step = () => {
      if (cancelled) return
      if (remaining-- > 0) {
        viewFrameRef.current = requestAnimationFrame(step)
        return
      }
      setView("chart")
      setSwapping(false)
    }
    viewFrameRef.current = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(viewFrameRef.current)
    }
  }, [swapping])

  const busy = swapping || (pending && slow)

  const missing = MAPPING_SLOTS[chartType]
    .filter((slot) => !slot.optional && !mapping[slot.key])
    .map((slot) => slot.label)

  // 이 카드에만 해당하는 경고. 파일 단위 경고는 위 요약 바가 맡는다.
  const caveats = [
    frame &&
      frame.folded > 0 &&
      `조각이 많아 나머지 ${frame.folded}개 범주는 "기타"로 묶었습니다.`,
    // 버리는 게 아니라 창으로 보는 것이므로, 나머지를 어떻게 보는지까지 말해준다.
    frame && frame.folded === 0 && frame.rows.length > 40 &&
      `범주가 ${frame.rows.length.toLocaleString()}개라 화면에 들어가는 만큼만 그립니다. 스크롤바로 나머지를 보세요.`,
    scatter && scatter.omitted > 0 && `점 ${scatter.omitted.toLocaleString()}개는 그리지 않았습니다.`,
  ].filter(Boolean)

  const drawable = Boolean(frame ?? scatter)
  const { axes, aside } = describe(spec)

  return (
    // 카드 아무 데나 누르면 사이드바가 그 카드를 편집한다. 키보드로는 번호 배지가 그 역할.
    <section
      onClick={onSelect}
      className={cn(
        "flex min-h-0 flex-col rounded-2xl border bg-card transition-colors",
        selected ? "border-foreground/30" : "border-border hover:border-foreground/15"
      )}
    >
      <header className="flex shrink-0 items-start gap-2.5 border-b border-border px-4 py-3">
        {/*
          번호는 장식이 아니다. 사이드바의 같은 배지와 짝이 되어 "지금 어느 카드를
          편집 중인지"를 두 패널에 걸쳐 잇는다.
        */}
        <button
          type="button"
          onClick={onSelect}
          aria-label={`차트 ${number} 편집`}
          aria-pressed={selected}
          className={cn(
            "mt-px flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-colors",
            selected ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
          )}
        >
          {number}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            {axes ? (
              <span className="font-mono">{axes}</span>
            ) : (
              <span className="text-muted-foreground">컬럼 선택 전</span>
            )}
            {aside && <span className="font-mono text-muted-foreground"> · {aside}</span>}
            {/* 집계 방식은 화면에 밝힌다. 몇 줄이 한 마크로 접혔는지가 안 보이면 오독한다. */}
            {usesAggregation(chartType) && (
              <span className="text-muted-foreground"> ({AGGREGATION_LABELS[aggregation]})</span>
            )}
          </p>
          {caveats.length > 0 && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>{caveats.join(" ")}</span>
            </p>
          )}
        </div>
        {drawable && (
          <ToggleGroup
            type="single"
            variant="outline"
            // 누른 쪽은 곧바로 눌린 것으로 보여야 한다. 그리는 것만 다음 프레임으로 미룬다.
            value={swapping ? "chart" : view}
            onValueChange={(next) => {
              if (!next || next === view) return
              if (next === "chart" && slow) setSwapping(true)
              else setView(next as View)
            }}
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
        {onRemove && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`차트 ${number} 삭제`}
            className="mt-0.5"
            onClick={(event) => {
              event.stopPropagation()
              onRemove()
            }}
          >
            <X />
          </Button>
        )}
      </header>

      {/*
        relative + 자식 absolute로 채운다. flex-1은 높이가 auto라서 자식의 h-full(백분율)이
        해석되지 못하고 콘텐츠 높이로 무너진다 — Recharts가 47px짜리 플롯을 그렸다.
      */}
      <div className="relative min-h-64 flex-1 p-4">
        {/* 계산 중에도 이전 차트를 남겨둔다. 비워버리면 화면이 튄다. */}
        <div className={busy ? "pointer-events-none h-full opacity-40" : "h-full"}>
          {!drawable ? (
            // 아직 계산 전인데 "그릴 게 없다"고 하면 안 된다. 표시를 안 띄우는
            // 빠른 경우에도 이 문구가 한 프레임 스쳐서는 안 되므로 pending으로 막는다.
            !pending && (
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
              <Spinner className="size-3.5" aria-label="차트를 그리는 중" />
              차트를 그리는 중…
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
