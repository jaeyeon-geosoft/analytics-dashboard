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
import {
  OTHER_LABEL,
  type ChartFrame,
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

function configFor(series: { key: string; label: string }[]): ChartConfig {
  return Object.fromEntries(
    series.map((entry, index) => [
      entry.key,
      {
        label: entry.label,
        color: series.length === 1 ? SINGLE : SLOTS[index],
      },
    ]),
  )
}

/** 이름이 길면 축에서 잘라 보여준다. 전체 이름은 툴팁과 표에 남는다. */
function truncate(value: string, max = 12): string {
  return value.length > max ? `${value.slice(0, max)}…` : value
}

/**
 * 축 이름은 Recharts의 `label` 대신 바깥에 HTML로 둔다. `insideLeft` 회전 라벨은
 * 눈금과 겹치고 폭을 예측할 수 없다. 여기 두면 텍스트 토큰도 그대로 쓸 수 있다.
 */
function AxisFrame({
  xLabel,
  yLabel,
  children,
}: {
  xLabel: string
  yLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 gap-1">
        <div
          className="shrink-0 self-center text-[11px] text-muted-foreground [writing-mode:vertical-rl] rotate-180"
          title={yLabel}
        >
          {truncate(yLabel, 24)}
        </div>
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
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

export function ChartView({
  chartType,
  frame,
  scatter,
}: {
  chartType: ChartType
  frame: ChartFrame | null
  scatter: ScatterFrame | null
}) {
  if (chartType === "scatter") {
    if (!scatter) return null
    return <ScatterView frame={scatter} />
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

  const grid = (
    <CartesianGrid
      stroke={GRID}
      strokeWidth={1}
      vertical={horizontal}
      horizontal={!horizontal}
    />
  )
  const legend = multi ? <ChartLegend content={<ChartLegendContent />} /> : null

  if (chartType === "line" || chartType === "area") {
    const Chart = chartType === "line" ? LineChart : AreaChart
    return (
      <AxisFrame xLabel={frame.xLabel} yLabel={frame.yLabel}>
        <ChartContainer config={config} className="aspect-auto h-full w-full">
          <Chart
            data={frame.rows}
            margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
          >
            {grid}
            <XAxis
              dataKey="x"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              tickFormatter={(value: string) => truncate(String(value), 10)}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={compact}
            />
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
                  stroke={multi ? SLOTS[index] : SINGLE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                />
              ) : (
                <Area
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  stackId={multi ? "a" : undefined}
                  stroke={multi ? SLOTS[index] : SINGLE}
                  strokeWidth={2}
                  fill={multi ? SLOTS[index] : SINGLE}
                  fillOpacity={0.1}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                />
              ),
            )}
          </Chart>
        </ChartContainer>
      </AxisFrame>
    )
  }

  return (
    // 가로 막대는 축이 뒤집힌다 — 아래가 값, 왼쪽이 범주.
    <AxisFrame
      xLabel={horizontal ? frame.yLabel : frame.xLabel}
      yLabel={horizontal ? frame.xLabel : frame.yLabel}
    >
      <ChartContainer config={config} className="aspect-auto h-full w-full">
        <BarChart
          data={frame.rows}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
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
                tickFormatter={compact}
              />
              <YAxis
                type="category"
                dataKey="x"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={96}
                tickFormatter={(value: string) => truncate(String(value), 12)}
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
                tickFormatter={(value: string) => truncate(String(value), 10)}
              />
              <YAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={52}
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
                fill={multi ? SLOTS[index] : SINGLE}
                maxBarSize={24}
                // 데이터 끝만 둥글게, 베이스라인 쪽은 각지게.
                radius={outermost ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
                // 누적 조각 사이는 테두리가 아니라 카드 색 2px 틈으로 갈라놓는다.
                stroke={stacked ? "var(--card)" : undefined}
                strokeWidth={stacked ? 2 : 0}
              />
            )
          })}
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
      className="aspect-auto h-full w-full [&_.recharts-pie-label-text]:fill-muted-foreground [&_.recharts-pie-label-text]:text-[11px]"
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

function ScatterView({ frame }: { frame: ScatterFrame }) {
  const config = configFor(frame.series)
  const multi = frame.series.length > 1

  return (
    <AxisFrame xLabel={frame.xLabel} yLabel={frame.yLabel}>
      <ChartContainer config={config} className="aspect-auto h-full w-full">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} />
          <XAxis
            type="number"
            dataKey="x"
            name={frame.xLabel}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={compact}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={frame.yLabel}
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
            />
          ))}
        </ScatterChart>
      </ChartContainer>
    </AxisFrame>
  )
}
