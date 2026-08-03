import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { ChartType } from "@/components/chart-type-picker"
import { isPointChart, isTimeline } from "@/lib/mapping-slots"
import { cn } from "@/lib/utils"
import {
  OTHER_LABEL,
  type ChartFrame,
  type ChartSeries,
  type ScatterFrame,
} from "@/lib/aggregate"

/**
 * 색은 엔티티(시리즈)에 고정한다. 슬롯 순서대로 1번부터 배정하고 절대 순환시키지
 * 않는다 — 필터로 시리즈가 줄어도 남은 시리즈의 색이 바뀌면 안 된다. 슬롯이 8개라
 * 9번째 시리즈는 애초에 매핑 단계에서 막혀 있다.
 */
const SLOTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
]

/** 단일 시리즈 막대는 전부 한 색이다. 길이가 이미 값을 보여주는데 색으로 또 칠하지 않는다. */
const SINGLE = "var(--chart-1)"

/** "기타"는 엔티티가 아니라 나머지를 접은 자리라서 무채색으로 물러난다. */
const OTHER_FILL = "var(--muted-foreground)"

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" }
const GRID = "var(--border)"

/** 축 눈금은 자릿수를 줄여 읽히게 한다. 1234567 → 1.2M */
function compact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function configFor(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((entry, index) => [
      entry.key,
      {
        // 축이 둘이면 범례가 어느 축의 선인지까지 말해야 한다. 색만으로는 왼쪽 눈금을
        // 읽어야 할지 오른쪽을 읽어야 할지 알 수 없다.
        label: entry.axis ? `${entry.label} (${entry.axis === "right" ? "우" : "좌"})` : entry.label,
        color: series.length === 1 ? SINGLE : SLOTS[index],
      },
    ]),
  )
}

/** 이름이 길면 축에서 잘라 보여준다. 전체 이름은 툴팁과 표에 남는다. */
function truncate(value: string, max = 12): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/** 앞부분을 뗄 때 여기서 끊는다. 한복판에서 자르면 시(hour)가 반토막 난다. */
const PREFIX_BOUNDARY = /[-_/:.T ]/
/** 이보다 짧은 공통부는 떼봐야 얻는 게 없다. */
const MIN_PREFIX = 4
/** 이보다 짧은 라벨은 애초에 안 잘린다. 뗄 이유가 없고, 떼면 맥락만 잃는다. */
const MIN_LABEL = 12

/**
 * 모든 범주 라벨이 공유하는 앞부분.
 *
 * 축은 앞에서부터 잘라 보여주는데, 타임스탬프처럼 **구분되는 정보가 뒤에 있는** 값은
 * 그러면 눈금이 전부 `2024-10-16…`으로 같아진다. 공통부를 떼어 뒤를 보여주고, 뗀
 * 부분은 축 이름에 한 번만 적는다.
 *
 * 보이는 창이 아니라 **전체**에서 구한다 — 창마다 다시 구하면 스크롤할 때 같은 눈금이
 * 딴 뜻이 된다.
 */
function sharedPrefix(rows: Record<string, string | number>[]): string {
  if (rows.length < 2) return ""

  let prefix = String(rows[0].x ?? "")
  let shortest = prefix.length
  for (const row of rows) {
    const value = String(row.x ?? "")
    if (value.length < shortest) shortest = value.length
    let index = 0
    while (index < prefix.length && index < value.length && prefix[index] === value[index]) {
      index += 1
    }
    prefix = prefix.slice(0, index)
    // 공통부가 없는 데이터(서울/부산/대구)가 대부분이라 여기서 일찍 빠져나온다.
    if (prefix.length < MIN_PREFIX) return ""
  }

  if (shortest <= MIN_LABEL) return ""

  let boundary = -1
  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    if (PREFIX_BOUNDARY.test(prefix[index])) {
      boundary = index
      break
    }
  }
  const trimmed = boundary >= 0 ? prefix.slice(0, boundary + 1) : prefix

  // 가장 짧은 라벨을 통째로 먹으면 눈금이 빈 문자열이 된다.
  return trimmed.length >= MIN_PREFIX && trimmed.length < shortest ? trimmed : ""
}

/** 직접 라벨이 붙을 자리를 담는 필드. 나머지 행은 빈 문자열이라 아무것도 안 그려진다. */
const SPOT = "__spot"

/**
 * 한 점에만 값을 적어 넣는다. 라벨을 render prop으로 그리는 대신 데이터에 얹으면
 * Recharts의 `LabelList`가 알아서 위치를 잡는다.
 */
function withSpotLabel(frame: ChartFrame, timeline: boolean) {
  const key = frame.series[0]?.key
  if (!key || frame.rows.length === 0) return frame.rows

  const spot = timeline
    ? frame.rows.length - 1 // 최신값
    : frame.rows.reduce(
        (best, row, index) => (Number(row[key]) > Number(frame.rows[best][key]) ? index : best),
        0
      ) // 최대값

  return frame.rows.map((row, index) => ({
    ...row,
    [SPOT]: index === spot ? Number(row[key]).toLocaleString(undefined, { maximumFractionDigits: 1 }) : "",
  }))
}

/** 값·라벨 글자는 시리즈 색이 아니라 텍스트 색을 입는다(CLAUDE.md). */
const SPOT_LABEL = {
  dataKey: SPOT,
  fill: "var(--foreground)",
  fontSize: 11,
  fontWeight: 500,
} as const

/** 마크 하나가 이보다 좁아지면 못 읽는다. 이 밑으로 내려가면 창을 잘라 스크롤로 넘긴다. */
const MIN_SLOT = 28

type PlotWindow = {
  plotRef: React.RefObject<HTMLDivElement | null>
  onWheel: (event: React.WheelEvent) => void
  bar: React.ReactNode
  vertical: boolean
  /** 지금 창의 첫 범주 인덱스 */
  start: number
  /** 창에 들어가는 범주 수 */
  size: number
}

/**
 * 보이는 범주만 그린다.
 *
 * 범주를 자르지 않으므로 만 행짜리 파일이면 마크도 만 개다 — Recharts가 SVG 노드를
 * 그만큼 만드느라 화면이 십여 초 멈췄다. 그릴 수 있는 만큼만 잘라 넘기고 나머지는
 * 스크롤바로 옮겨 본다. 마크 수가 화면 크기에 묶여서 범주가 몇 개든 비용이 같다.
 *
 * **스크롤바는 반드시 플롯 바깥에 둔다.** 플롯 자체에 `overflow`를 걸면 스크롤바가
 * 생겼다 사라지며 가용 폭이 15px씩 진동하고, ResponsiveContainer가 그때마다 다시
 * 측정해 초당 수천 번 리렌더한다(실제로 겪었다). 여기서 크기를 재는 상자는 절대
 * 스크롤하지 않으므로 그 되먹임이 없다.
 */
function usePlotWindow(count: number, vertical: boolean, slot: number): PlotWindow {
  const plotRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [extent, setExtent] = useState(0)
  const [start, setStart] = useState(0)

  useEffect(() => {
    const element = plotRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setExtent(vertical ? height : width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [vertical])

  // slot이 0이면 창을 쓰지 않는다 — 전부 그린다.
  const size = slot > 0 ? Math.max(1, Math.floor(extent / slot)) : count
  const limit = Math.max(0, count - size)
  // 컬럼이나 차트 종류가 바뀌면 범주 수가 줄어든다. 렌더에는 잘라낸 값을 쓴다.
  const offset = Math.min(start, limit)

  const onScroll = useCallback(() => {
    const element = barRef.current
    if (!element) return
    const travel = vertical
      ? element.scrollHeight - element.clientHeight
      : element.scrollWidth - element.clientWidth
    const at = vertical ? element.scrollTop : element.scrollLeft
    setStart(travel > 0 ? Math.round((at / travel) * limit) : 0)
  }, [limit, vertical])

  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      const element = barRef.current
      if (!element) return
      // 가로로 넘길 때는 트랙패드의 deltaX와 휠의 deltaY를 둘 다 받는다.
      const delta = vertical
        ? event.deltaY
        : Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY
      if (delta === 0) return
      if (vertical) element.scrollTop += delta
      else element.scrollLeft += delta
    },
    [vertical]
  )

  // 트랙 대비 썸 크기가 곧 "전체 중 얼마를 보고 있는지"가 된다.
  const bar =
    limit > 0 ? (
      <div
        ref={barRef}
        onScroll={onScroll}
        className={cn(
          "shrink-0 [scrollbar-width:thin]",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          vertical
            ? "ml-1 w-2 overflow-y-auto [&::-webkit-scrollbar]:w-2"
            : "mt-1.5 h-2 overflow-x-auto [&::-webkit-scrollbar]:h-2"
        )}
      >
        <div
          style={
            vertical
              ? { height: `${(count / size) * 100}%`, width: 1 }
              : { width: `${(count / size) * 100}%`, height: 1 }
          }
        />
      </div>
    ) : null

  return { plotRef, onWheel, bar, vertical, start: offset, size }
}

/**
 * 축 이름은 Recharts의 `label` 대신 바깥에 HTML로 둔다. `insideLeft` 회전 라벨은
 * 눈금과 겹치고 폭을 예측할 수 없다. 여기 두면 텍스트 토큰도 그대로 쓸 수 있다.
 *
 * `plot`을 주면 창 스크롤바가 붙는다 — 가로 막대는 오른쪽, 나머지는 아래.
 */
/**
 * 세로로 세운 값 축 이름.
 *
 * 글자 수로 자르면 공간이 남는데도 잘린다 — 축 이름에 붙는 "(앞 … 공통)"이 통째로
 * 날아갔다. 세로쓰기라 넘침도 세로로 나므로 CSS에 맡긴다.
 *
 * `color`는 축이 둘일 때만 들어온다. 이름 옆의 색 마크가 "이 축은 이 선의 것"을
 * 잇는다 — 글자 자체는 시리즈 색으로 칠하지 않는다(CLAUDE.md).
 */
function AxisName({
  label,
  color,
  side,
}: {
  label: string
  color?: string
  side: "left" | "right"
}) {
  return (
    <div className="flex max-h-full min-h-0 shrink-0 flex-col items-center justify-center gap-1.5 self-center">
      {color && (
        <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ background: color }} />
      )}
      <div
        className={cn(
          "min-h-0 overflow-hidden text-[11px] text-ellipsis whitespace-nowrap text-muted-foreground [writing-mode:vertical-rl]",
          side === "left" && "rotate-180"
        )}
        title={label}
      >
        {label}
      </div>
    </div>
  )
}

function AxisFrame({
  xLabel,
  yLabel,
  yRightLabel,
  colors,
  plot,
  children,
}: {
  xLabel: string
  yLabel: string
  /** 오른쪽 축 이름. 이중 축(선 차트)에서만 들어온다. */
  yRightLabel?: string
  /** 이중 축일 때 두 축 이름에 붙일 선 색 */
  colors?: [string, string]
  /** 없으면 스크롤 없이 그대로 채운다(산점도) */
  plot?: PlotWindow
  children: React.ReactNode
}) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex min-h-0 flex-1 gap-1">
        <AxisName label={yLabel} color={colors?.[0]} side="left" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1">
            <div
              ref={plot?.plotRef}
              onWheel={plot?.onWheel}
              className="relative min-h-0 min-w-0 flex-1"
            >
              {children}
            </div>
            {plot?.vertical && plot.bar}
          </div>
          {plot && !plot.vertical && plot.bar}
        </div>
        {yRightLabel && <AxisName label={yRightLabel} color={colors?.[1]} side="right" />}
      </div>
      <p
        className="mt-1 shrink-0 truncate text-center text-[11px] text-muted-foreground"
        title={xLabel}
      >
        {xLabel}
      </p>
    </div>
  )
}

/**
 * 값 축의 상한. 창을 옮길 때마다 축이 다시 잡히면 창끼리 비교가 거짓말이 되므로
 * **보이는 창이 아니라 전체**를 기준으로 고정한다.
 */
function peakValue(frame: ChartFrame, stacked: boolean, series: ChartSeries[]): number {
  let peak = 0
  for (const row of frame.rows) {
    if (stacked) {
      let total = 0
      for (const entry of series) total += Number(row[entry.key]) || 0
      if (total > peak) peak = total
    } else {
      for (const entry of series) {
        const value = Number(row[entry.key]) || 0
        if (value > peak) peak = value
      }
    }
  }
  return peak
}

/** 눈금이 196,323 같은 수로 끝나지 않게 한 자리 위로 올린다. */
function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

export function ChartView({
  chartType,
  frame,
  scatter,
}: {
  chartType: ChartType
  frame: ChartFrame | null
  scatter: ScatterFrame | null
}) {
  if (isPointChart(chartType)) {
    if (!scatter) return null
    return <ScatterView frame={scatter} connected={chartType === "path"} />
  }
  if (!frame) return null
  if (chartType === "pie") return <PieView frame={frame} />
  return <CartesianView chartType={chartType} frame={frame} />
}

function CartesianView({
  chartType,
  frame,
}: {
  chartType: ChartType
  frame: ChartFrame
}) {
  const config = configFor(frame.series)
  const multi = frame.series.length > 1
  const horizontal = chartType === "hbar"
  const stacked = chartType === "stacked"
  const timeline = isTimeline(chartType)
  // 오른쪽 축에 놓인 시리즈가 있으면 이중 축이다(선 차트에서만 생긴다).
  const dual = frame.series.some((entry) => entry.axis === "right")

  /*
    창은 **마크가 노드마다 하나씩 생기는 종류에만** 필요하다. 막대 만 개는 `<rect>` 만
    개라 화면이 십여 초 멈추지만, 선·영역은 점이 몇 개든 `<path>` 하나다 — 노드가 늘지
    않으니 자를 이유가 없다. 자르면 오히려 5시간짜리 시계열의 모양을 볼 수 없다.
  */
  const plot = usePlotWindow(frame.rows.length, horizontal, timeline ? 0 : MIN_SLOT)

  // 의미 있는 지점 하나만 직접 라벨한다 — 막대는 최대값, 선·영역은 최신값.
  // 모든 점에 숫자를 찍으면 아무도 안 읽는다(CLAUDE.md). 나머지 값은 축과 툴팁,
  // 표 보기가 맡는다. 시리즈가 여럿이면 끝점이 서로 겹칠 수 있어 붙이지 않는다.
  //
  // 라벨을 먼저 붙이고 자른다 — 그래야 창 안의 최대가 아니라 진짜 최대에만 붙는다.
  //
  // 시계열은 이 방식을 쓰지 않는다. `LabelList`는 **점마다 `<text>`를 하나씩** 만드는데,
  // 값이 적히는 건 한 점뿐인데도 3,002개가 생겨 렌더가 30초 걸렸다(측정). 창으로 40개만
  // 그릴 때는 드러나지 않던 비용이다. 대신 아래에서 그 한 점에만 주석을 단다.
  const labeled = useMemo(
    () => (multi || timeline ? frame.rows : withSpotLabel(frame, false)),
    [frame, multi, timeline]
  )
  const rows = useMemo(
    () => labeled.slice(plot.start, plot.start + plot.size),
    [labeled, plot.start, plot.size]
  )

  // 축이 둘이면 최대값도 축마다 따로 잡는다 — 한 스케일로 묶으면 오른쪽 축을 세운
  // 이유가 없어진다. 대신 **둘 다 0에서 시작**한다. 두 축을 임의로 어긋나게 맞추면
  // 선이 교차하는 자리가 달라져서 데이터에 없는 상관관계가 보인다.
  const [valueDomain, rightDomain] = useMemo(() => {
    // 음수가 섞이면 0을 바닥으로 잡을 수 없다. 그때는 Recharts에 맡긴다.
    const domainOf = (subset: ChartSeries[]): [number, number] | undefined => {
      const peak = niceCeil(peakValue(frame, stacked, subset))
      return peak > 0 ? [0, peak] : undefined
    }
    if (!dual) return [domainOf(frame.series), undefined]
    return [
      domainOf(frame.series.filter((entry) => entry.axis !== "right")),
      domainOf(frame.series.filter((entry) => entry.axis === "right")),
    ]
  }, [frame, stacked, dual])

  const prefix = useMemo(() => sharedPrefix(frame.rows), [frame.rows])
  const category = (value: string, max: number) => truncate(String(value).slice(prefix.length), max)
  const categoryLabel = prefix ? `${frame.xLabel} (앞 "${prefix}" 공통)` : frame.xLabel
  // 공통부를 뗀 라벨은 남은 글자가 전부 의미 있는 정보라 더 보여준다. 가로로 놓인 축은
  // 서로 겹치는 눈금을 Recharts가 알아서 감춘다. 세로 축(가로 막대)은 폭이 96px로
  // 고정이라 늘리지 않는다 — 늘리면 플롯이 그만큼 좁아진다.
  const acrossMax = prefix ? 16 : 10

  const grid = (
    <CartesianGrid
      stroke={GRID}
      strokeWidth={1}
      vertical={horizontal}
      horizontal={!horizontal}
    />
  )
  const legend = multi ? <ChartLegend content={<ChartLegendContent />} /> : null

  /*
    기준선. 파선인 것은 dataviz의 "격자선을 점선으로 긋지 말 것"과 어긋나지 않는다 —
    그 규칙은 **그냥 격자선인데** 임계값처럼 읽히는 걸 막는 것이라, 진짜 임계선은 파선이
    맞다. 색은 시리즈 슬롯을 쓰지 않는다: 기준선은 엔티티가 아니라 주석이고, 빨강을 쓰면
    "나쁨"이라는 없는 의미가 붙는다. 라벨 글자도 텍스트 색이다(CLAUDE.md).

    히스토그램만 x축이 범주축(구간 라벨)이라 값이 든 구간에 스냅된다. 정확한 수는 축 이름이
    들고 있다. 나머지는 y축이 수치축이라 그대로 그 자리에 선다.

    선 위에 라벨을 붙이지 않는 것은, 최대값 직접 라벨과 같은 자리를 다투기 때문이다 —
    분포에서는 기준선이 든 구간이 곧 최빈 구간인 경우가 흔해서 거의 항상 겹친다. 대신 그
    값이 놓인 **축의 이름**에 적는다. 집계 방식을 적는 자리와 같다.
  */
  // 기준선은 언제나 **값 축** 위에 선다. 분포만 값이 가로축이고(세로는 개수), 가로 막대는
  // 축이 뒤집혀 값이 가로다.
  // 세 갈래의 합집합을 그대로 두면 Recharts의 제네릭이 한쪽으로 좁혀져 안 맞는다.
  const referenceAt: { x?: string | number; y?: number } | undefined =
    frame.reference &&
    (chartType === "histogram"
      ? { x: frame.reference.atCategory }
      : horizontal
        ? { x: frame.reference.value }
        : { y: frame.reference.value })
  const reference = referenceAt && [
    // 카드 색을 먼저 깔아 마크에서 떼어 놓는다 — 겹치는 점의 링, 누적 조각 사이의 틈과
    // 같은 방식이다. 이게 없으면 채도 높은 막대 위에서 파선이 묻힌다.
    <ReferenceLine key="halo" {...referenceAt} stroke="var(--card)" strokeWidth={4} />,
    // 격자선은 뒤로 물러나야 하지만 기준선은 다르다 — 읽으라고 있는 주석이라 텍스트 색이다.
    <ReferenceLine
      key="line"
      {...referenceAt}
      stroke="var(--foreground)"
      strokeWidth={1.5}
      strokeDasharray="4 4"
    />,
  ]
  const withReference = (base: string, onThisAxis: boolean) =>
    frame.reference && onThisAxis ? `${base} · ┄ ${frame.reference.label}` : base

  // 시계열의 최신값 한 점. 노드 하나로 끝난다(위 `labeled` 주석 참고).
  const last = timeline && !multi ? frame.rows[frame.rows.length - 1] : undefined
  const lastKey = frame.series[0]?.key
  const spot = last && lastKey !== undefined && (
    <ReferenceDot
      x={String(last.x)}
      y={Number(last[lastKey])}
      r={0}
      label={{
        value: Number(last[lastKey]).toLocaleString(undefined, { maximumFractionDigits: 1 }),
        position: "top",
        fill: "var(--foreground)",
        fontSize: 11,
        fontWeight: 500,
      }}
    />
  )

  if (chartType === "line" || chartType === "area") {
    const Chart = chartType === "line" ? LineChart : AreaChart
    return (
      <AxisFrame
        xLabel={categoryLabel}
        yLabel={withReference(frame.yLabel, true)}
        yRightLabel={frame.y2Label}
        colors={dual ? [SLOTS[0], SLOTS[1]] : undefined}
        plot={plot}
      >
        <ChartContainer config={config} className="absolute inset-0 aspect-auto">
          <Chart
            data={rows}
            // 최신값 라벨이 마지막 점 위에 놓인다. 절반이 오른쪽으로 나가므로 자리를 둔다.
            margin={{ top: 24, right: multi ? 16 : 40, bottom: 4, left: 4 }}
          >
            {grid}
            {/*
              눈금 간격을 반드시 숫자로 준다. 안 주면 Recharts가 어느 눈금을 감출지
              정하려고 **모든 라벨의 폭을 잰다** — 창을 쓸 때는 40개뿐이라 드러나지
              않았지만, 시계열 전체를 그리면 3,000개를 재느라 95초를 잡아먹었다.
            */}
            <XAxis
              dataKey="x"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={Math.max(0, Math.ceil(rows.length / 12) - 1)}
              tickFormatter={(value: string) => category(value, acrossMax)}
            />
            {/*
              왼쪽 축은 id를 주지 않는다 — Recharts의 기본 id(0)를 그대로 써야
              `CartesianGrid`(역시 기본 id를 본다)의 가로 격자선이 살아 있다. 오른쪽만
              별도 id를 갖고, 격자선은 왼쪽 눈금을 따른다.
            */}
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={valueDomain}
              tickFormatter={compact}
            />
            {dual && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={rightDomain}
                tickFormatter={compact}
              />
            )}
            {/* 선·영역은 크로스헤어 + 한 번에 전 시리즈를 읽는 툴팁 */}
            <ChartTooltip
              cursor={{ stroke: GRID, strokeWidth: 1 }}
              content={<ChartTooltipContent indicator="line" className="min-w-44" />}
            />
            {legend}
            {frame.series.map((entry, index) =>
              chartType === "line" ? (
                <Line
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  yAxisId={entry.axis === "right" ? "right" : undefined}
                  stroke={multi ? SLOTS[index] : SINGLE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                />
              ) : (
                <Area
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  stackId={multi ? "a" : undefined}
                  isAnimationActive={false}
                  stroke={multi ? SLOTS[index] : SINGLE}
                  strokeWidth={2}
                  fill={multi ? SLOTS[index] : SINGLE}
                  fillOpacity={0.1}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                />
              ),
            )}
            {spot}
            {reference}
          </Chart>
        </ChartContainer>
      </AxisFrame>
    )
  }

  return (
    // 가로 막대는 축이 뒤집힌다 — 아래가 값, 왼쪽이 범주.
    <AxisFrame
      // 기준선 값은 그것이 선 축의 이름에 붙는다. 분포는 값이 가로축이고, 가로 막대는
      // 축이 통째로 뒤집혀 있다.
      xLabel={
        horizontal
          ? withReference(frame.yLabel, true)
          : withReference(categoryLabel, chartType === "histogram")
      }
      yLabel={
        horizontal ? categoryLabel : withReference(frame.yLabel, chartType !== "histogram")
      }
      plot={plot}
    >
      <ChartContainer config={config} className="absolute inset-0 aspect-auto">
        <BarChart
          data={rows}
          layout={horizontal ? "vertical" : "horizontal"}
          // 최대값 라벨이 막대 끝 바깥에 놓일 자리를 둔다.
          margin={{ top: horizontal ? 8 : 24, right: horizontal ? 56 : 16, bottom: 4, left: 4 }}
          barCategoryGap="20%"
        >
          {grid}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                domain={valueDomain}
                tickFormatter={compact}
              />
              <YAxis
                type="category"
                dataKey="x"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={96}
                tickFormatter={(value: string) => category(value, 12)}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="x"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                interval="preserveStartEnd"
                tickFormatter={(value: string) => category(value, acrossMax)}
              />
              <YAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={valueDomain}
                tickFormatter={compact}
              />
            </>
          )}
          {/* 막대는 크로스헤어 없이 마크마다 툴팁. 커서는 아주 옅은 밴드만. */}
          <ChartTooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
            content={<ChartTooltipContent indicator="line" className="min-w-44" />}
          />
          {legend}
          {frame.series.map((entry, index) => {
            // 누적은 맨 위 조각만 끝을 둥글게 한다. 중간 조각까지 둥글면 울퉁불퉁해진다.
            const outermost = !stacked || index === frame.series.length - 1
            return (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                stackId={stacked ? "a" : undefined}
                isAnimationActive={false}
                fill={multi ? SLOTS[index] : SINGLE}
                maxBarSize={24}
                // 데이터 끝만 둥글게, 베이스라인 쪽은 각지게.
                radius={outermost ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
                // 누적 조각 사이는 테두리가 아니라 카드 색 2px 틈으로 갈라놓는다.
                stroke={stacked ? "var(--card)" : undefined}
                strokeWidth={stacked ? 2 : 0}
                // 최대값 막대 끝에만 값을 적는다.
                label={
                  multi ? undefined : { ...SPOT_LABEL, position: horizontal ? "right" : "top", offset: 8 }
                }
              />
            )
          })}
          {reference}
        </BarChart>
      </ChartContainer>
    </AxisFrame>
  )
}

function PieView({ frame }: { frame: ChartFrame }) {
  // 원형은 시리즈로 쪼개지 않는다 — 조각이 곧 범주다.
  const valueKey = frame.series[0]?.key
  if (!valueKey) return null

  const config: ChartConfig = Object.fromEntries(
    frame.rows.map((row, index) => [
      String(row.x),
      {
        label: String(row.x),
        color: row.x === OTHER_LABEL ? OTHER_FILL : SLOTS[index],
      },
    ]),
  )

  return (
    <ChartContainer
      config={config}
      // Recharts는 조각 라벨에 조각 색을 물려준다. 라벨은 텍스트 색을 입어야 해서
      // (라이트 모드에서 노랑·아쿠아는 읽히지 않는다) CSS로 덮어쓴다 —
      // CSS fill이 SVG 표현 속성보다 우선한다.
      className="absolute inset-0 aspect-auto [&_.recharts-pie-label-text]:fill-muted-foreground [&_.recharts-pie-label-text]:text-[11px]"
    >
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="x" indicator="line" className="min-w-44" />}
        />
        <Pie
          data={frame.rows}
          dataKey={valueKey}
          nameKey="x"
          innerRadius="35%"
          outerRadius="72%"
          // 조각 사이 2px는 카드 색으로 벌린다. 테두리를 그리지 않는다.
          paddingAngle={1}
          stroke="var(--card)"
          strokeWidth={2}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${truncate(String(name ?? ""), 10)} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: GRID }}
        >
          {frame.rows.map((row, index) => (
            <Cell
              key={String(row.x)}
              fill={row.x === OTHER_LABEL ? OTHER_FILL : SLOTS[index]}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="x" />} />
      </PieChart>
    </ChartContainer>
  )
}

function ScatterView({ frame, connected }: { frame: ScatterFrame; connected?: boolean }) {
  const config = configFor(frame.series)
  const multi = frame.series.length > 1

  return (
    <AxisFrame xLabel={frame.xLabel} yLabel={frame.yLabel}>
      <ChartContainer config={config} className="absolute inset-0 aspect-auto">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} />
          {/*
            "축은 0에서 시작"은 막대 차트 규칙이다(CLAUDE.md). 여기서는 길이가 아니라
            위치가 값이라 0을 끼워 넣을 이유가 없고, 끼우면 원점에서 먼 데이터가
            (위·경도, 연도, 기온) 구석에 뭉쳐 아무것도 안 보인다. Recharts의 수치 축
            기본값이 `[0, "auto"]`라 명시적으로 데이터에 맞춘다.
          */}
          <XAxis
            type="number"
            dataKey="x"
            name={frame.xLabel}
            domain={["auto", "auto"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={compact}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={frame.yLabel}
            domain={["auto", "auto"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={compact}
          />
          {/*
            ZAxis로 점 크기를 지정하지 않는다. Recharts 3에서 dataKey 없는 range는
            반지름 1px 미만으로 뭉개져 2px 링에 완전히 덮인다. 기본값(면적 64)이
            r≈4.5 = 지름 9px라 "마커 8px 이상"을 그대로 만족한다.
          */}
          <ChartTooltip
            cursor={{ strokeDasharray: "0", stroke: GRID }}
            content={<ChartTooltipContent indicator="line" className="min-w-44" />}
          />
          {multi && <ChartLegend content={<ChartLegendContent />} />}
          {frame.series.map((entry, index) => (
            <Scatter
              key={entry.key}
              name={entry.label}
              data={entry.points}
              fill={multi ? SLOTS[index] : SINGLE}
              // 겹치는 점은 카드 색 링으로 떼어 놓는다.
              stroke="var(--card)"
              strokeWidth={2}
              /*
                궤적은 점을 데이터 순서대로 직선으로 잇는다(Recharts 기본
                `lineType: "joint"` + `lineJointType: "linear"`). 선 색은 Recharts가
                이 마크의 `fill`에서 가져가므로 여기서 다시 주지 않는다 — 위의
                `stroke`는 링 색이라 그대로 넘어가면 선이 카드 색으로 사라진다.
              */
              line={
                connected
                  ? { strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }
                  : false
              }
            />
          ))}
        </ScatterChart>
      </ChartContainer>
    </AxisFrame>
  )
}
