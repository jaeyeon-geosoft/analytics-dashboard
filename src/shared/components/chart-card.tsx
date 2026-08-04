import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { ChartView } from "@/shared/components/chart-view"
import { DataTable } from "@/shared/components/data-table"
import {
  AGGREGATION_LABELS,
  buildPlot,
  type PlotData,
  type PlotRequest,
} from "@/shared/lib/aggregate"
import { describeMapping, type ChartSpec } from "@/shared/lib/chart-spec"
import type { ChartType } from "@/shared/lib/chart-types"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import {
  isPointChart,
  isTimeline,
  MAPPING_SLOTS,
  usesAggregation,
} from "@/shared/lib/mapping-slots"
import type { DataFrame } from "@/shared/lib/dataset"
import { cn } from "@/shared/lib/utils"

type View = "chart" | "table"

/**
 * rAF를 `count`번 양보한 뒤 실행한다. 정리 함수를 돌려주므로 effect에서 그대로
 * `return`하면 된다.
 *
 * 집계와 Recharts 렌더는 둘 다 동기라서, 범주가 만 개쯤 되면 그동안 화면이 통째로
 * 멈춘다. 계산을 미뤄서 "그리는 중"이 먼저 찍히게 하는 것이 목적이다. **한 번만
 * 양보하면 같은 프레임에 묶여 표시가 보이지 않으므로 최소 두 번**이다.
 */
function afterFrames(count: number, run: () => void): () => void {
  let remaining = count
  let cancelled = false
  let frame = requestAnimationFrame(function step() {
    if (cancelled) return
    if (remaining-- > 0) {
      frame = requestAnimationFrame(step)
      return
    }
    run()
  })
  return () => {
    cancelled = true
    cancelAnimationFrame(frame)
  }
}

/**
 * 그릴 것을 한 프레임 뒤에 만든다.
 *
 * 입력 묶음의 정체성이 곧 "무엇을 그려야 하는지"다. 결과에 그 묶음을 붙여두면
 * `pending`을 따로 상태로 들 필요 없이 비교만으로 나온다(effect 안 동기 setState 금지).
 *
 * `order`만큼 더 미루는 것은 카드끼리 계산이 한 프레임에 몰리지 않게 하기 위한 것이다 —
 * 앞 카드부터 한 장씩 차례로 그려진다.
 */
function useDeferredPlot(request: PlotRequest, order: number) {
  const [built, setBuilt] = useState<{ request: PlotRequest; plot: PlotData | null } | null>(null)

  useEffect(
    () => afterFrames(2 + order, () => setBuilt({ request, plot: buildPlot(request) })),
    [request, order]
  )

  return { plot: built?.plot ?? null, pending: built?.request !== request }
}

/**
 * 차트↔표 전환.
 *
 * 보기를 바꾸는 것도 무거운 계산과 같은 자리다. 표와 막대·선·영역은 창으로 줄어서
 * 오가는 값이 거의 없는데, 산점도는 점을 그대로 그려서 **차트로 돌아가는 쪽**만
 * commit 하나가 통째로 프레임을 넘긴다(점 3,000개 383ms, 걷어내는 쪽은 40ms).
 * 그래서 표로 가는 전환에는 표시를 띄우지 않는다 — 재봤을 때 72ms였고, 그 정도로
 * 스쳐 지나가는 스피너는 한 바퀴를 못 돌아 오히려 고장 난 것처럼 보인다.
 */
function useChartTableToggle(slow: boolean) {
  const [view, setView] = useState<View>("chart")
  /** 표에서 차트로 돌아가는 중. 표시를 먼저 찍으려고 한 프레임 미뤄둔 상태다. */
  const [swapping, setSwapping] = useState(false)

  useEffect(() => {
    if (!swapping) return
    return afterFrames(2, () => {
      setView("chart")
      setSwapping(false)
    })
  }, [swapping])

  return {
    view,
    swapping,
    // 누른 쪽은 곧바로 눌린 것으로 보여야 한다. 그리는 것만 다음 프레임으로 미룬다.
    pressed: swapping ? ("chart" as const) : view,
    select(next: View) {
      if (next === view) return
      if (next === "chart" && slow) setSwapping(true)
      else setView(next)
    },
  }
}

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

/** 이보다 범주가 많으면 한 창에 다 들어가지 않는다. 나머지를 어떻게 보는지 알려준다. */
const CROWDED = 40

/**
 * 이 카드에만 해당하는 경고. 파일 단위 경고는 캔버스의 요약 바가 맡는다.
 *
 * 상한에 걸려 뺀 것은 반드시 알린다(CLAUDE.md) — 100만 행을 마크 몇 개로 줄여놓고
 * 어떻게 줄였는지 안 쓰면 조용히 오독하게 만든다.
 */
function caveatsFor(plot: PlotData, chartType: ChartType): string[] {
  if (plot.kind === "scatter") {
    const { omitted } = plot.frame
    return omitted > 0 ? [`점 ${omitted.toLocaleString()}개는 그리지 않았습니다.`] : []
  }

  const { folded, rows, sampledFrom } = plot.frame
  const notes: string[] = []
  if (folded > 0) {
    notes.push(`조각이 많아 나머지 ${folded}개 범주는 "기타"로 묶었습니다.`)
  } else if (rows.length > CROWDED && !isTimeline(chartType)) {
    // 버리는 게 아니라 창으로 보는 것이므로, 나머지를 어떻게 보는지까지 말해준다.
    // 선·영역은 창을 쓰지 않고 전부 그리므로 이 말이 거짓이 된다.
    notes.push(
      `범주가 ${rows.length.toLocaleString()}개라 화면에 들어가는 만큼만 그립니다. 스크롤바로 나머지를 보세요.`
    )
  }
  if (sampledFrom) {
    notes.push(
      `점 ${sampledFrom.toLocaleString()}개를 화면 해상도에 맞춰 ${rows.length.toLocaleString()}개로 줄여 그렸습니다. 구간마다 최소·최대를 남겨 튀는 값은 그대로입니다.`
    )
  }
  return notes
}

export function ChartCard({
  spec,
  number,
  order,
  data,
  columns,
  title,
  selected,
  onSelect,
  onRemove,
}: {
  spec: ChartSpec
  /** 사이드바의 같은 배지와 짝이 되는 번호. 어드민에서만 쓴다. */
  number?: number
  /** 그리드에서의 순번. 카드끼리 계산이 같은 프레임에 겹치지 않게 미루는 데 쓴다. */
  order: number
  data: DataFrame
  columns: ColumnInfo[]
  /** 저장된 제목. 없으면 매핑에서 만든다 — 어드민에는 아직 제목 입력란이 없다. */
  title?: string
  /**
   * 편집 어포던스는 전부 선택이다. 뷰어는 고르지도 지우지도 않으므로 넘기지 않고,
   * 그러면 배지·클릭·삭제가 통째로 빠진다. 계산 지연·표 토글·경고는 양쪽 공통이라 남는다.
   */
  selected?: boolean
  onSelect?: () => void
  onRemove?: () => void
}) {
  const { chartType, mapping, aggregation, reference } = spec

  const request = useMemo(
    () => ({ chartType, mapping, aggregation, reference, columns, rows: data.rows }),
    [chartType, mapping, aggregation, reference, columns, data.rows]
  )
  const slow = looksSlow(chartType, data.rows.length)
  const { plot, pending } = useDeferredPlot(request, order)
  const toggle = useChartTableToggle(slow)

  const busy = toggle.swapping || (pending && slow)
  const caveats = plot ? caveatsFor(plot, chartType) : []
  const { axes, aside } = describeMapping(spec)
  // 저장된 제목이 우선. 어드민은 아직 제목이 없어서 매핑 요약으로 떨어진다.
  const heading = title ?? axes

  const missing = MAPPING_SLOTS[chartType]
    .filter((slot) => !slot.optional && !mapping[slot.key])
    .map((slot) => slot.label)

  return (
    // 카드 아무 데나 누르면 사이드바가 그 카드를 편집한다. 키보드로는 번호 배지가 그 역할.
    <section
      onClick={onSelect}
      className={cn(
        // `overflow-hidden`이 없으면 카드가 내용보다 작아졌을 때 차트·눈금·스크롤바가
        // 테두리 밖으로 그대로 흘러나온다. 어드민에서 카드를 줄일 수 있게 되면서
        // 실제로 그렇게 됐다 — 상자가 내용을 가둬야 모서리의 크기 손잡이도 제자리로 보인다.
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card transition-colors",
        !onSelect
          ? "border-border"
          : selected
            ? "border-foreground/30"
            : "border-border hover:border-foreground/15"
      )}
    >
      <header className="flex shrink-0 items-start gap-2.5 border-b border-border px-4 py-3">
        {/*
          번호는 장식이 아니다. 사이드바의 같은 배지와 짝이 되어 "지금 어느 카드를
          편집 중인지"를 두 패널에 걸쳐 잇는다.
        */}
        {onSelect && (
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
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            {heading ? (
              <span className="font-mono">{heading}</span>
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
        {plot && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={toggle.pressed}
            onValueChange={(next) => next && toggle.select(next as View)}
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
          {plot === null ? (
            // 아직 계산 전인데 "그릴 게 없다"고 하면 안 된다. 표시를 안 띄우는
            // 빠른 경우에도 이 문구가 한 프레임 스쳐서는 안 되므로 pending으로 막는다.
            !pending && (
              <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {missing.length > 0
                  ? `${missing.join(", ")}을(를) 고르면 차트가 그려집니다.`
                  : "고른 컬럼으로 그릴 수 있는 값이 없습니다. 컬럼 타입을 확인해 주세요."}
              </p>
            )
          ) : toggle.view === "chart" ? (
            <ChartView chartType={chartType} plot={plot} />
          ) : (
            <DataTable plot={plot} />
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
