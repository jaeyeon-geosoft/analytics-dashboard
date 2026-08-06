import { useEffect, useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"
import { AxisFrame } from "@/shared/components/chart-view/axis-frame"
import {
  SPOT_LABEL,
  SPOT_OFFSET,
  VALUE_AXIS_W,
  valueLabelWidth,
  withSpotLabel,
} from "@/shared/components/chart-view/bar-labels"
import { configFor } from "@/shared/components/chart-view/chart-config"
import {
  AXIS_TICK,
  BAR_RADIUS,
  CATEGORY_AXIS_MAX_CHARS,
  CATEGORY_AXIS_WIDTH,
  MAX_BAR_SIZE,
  STACK_GAP,
  TOOLTIP_CLASS,
  VALUE_AXIS_WIDTH,
} from "@/shared/components/chart-view/constants"
import { useCategoryAxis } from "@/shared/components/chart-view/hooks/use-category-axis"
import { usePlotWindow } from "@/shared/components/chart-view/hooks/use-plot-window"
import { referenceLines } from "@/shared/components/chart-view/reference-lines"
import type { ChartFrame } from "@/shared/lib/aggregate"
import { valueDomain } from "@/shared/lib/axis-domain"
import { valueAxisName } from "@/shared/lib/axis-labels"
import { GRID, SURFACE, seriesColor } from "@/shared/lib/chart-colors"
import type { ChartType } from "@/shared/lib/chart-types"
import { tickFormatFor } from "@/shared/lib/number-format"

/** 막대 사이 간격. 칸 폭 대비 비율이라 창 크기와 무관하게 같은 리듬을 유지한다. */
const BAR_CATEGORY_GAP = "20%"

/** 가로 막대의 오른쪽 여백 하한. 값 라벨이 가장 길 때는 그 폭에 맞춰 넓힌다. */
const MIN_RIGHT_MARGIN = 56
const RIGHT_MARGIN_PAD = 12

/** 막대 끝의 값 라벨이 놓일 자리. 세로는 위, 가로는 오른쪽이다. */
const MARGIN_VERTICAL = { top: 24, right: 16, bottom: 4, left: 4 }
const MARGIN_HORIZONTAL_TOP = 8

/** 막대 · 가로 막대 · 누적 막대. 마크 하나가 `<rect>` 하나라 창으로 잘라 그린다. */
export function BarView({
  frame,
  chartType,
  onLabelsFolded,
}: {
  frame: ChartFrame
  chartType: ChartType
  onLabelsFolded?: (folded: boolean) => void
}) {
  const config = configFor(frame.series)
  const multi = frame.series.length > 1
  const horizontal = chartType === "hbar"
  const stacked = chartType === "stacked"
  const axis = useCategoryAxis(frame)

  const plot = usePlotWindow(frame.rows.length, horizontal)
  const labelW = useMemo(() => valueLabelWidth(frame), [frame])
  /*
    막대마다 값을 적을지.

    가로 막대는 값이 막대 오른쪽에 나란히 서고 칸마다 최소 28px가 확보되므로 항상
    적는다. 세로 막대는 칸 폭이 글자 폭보다 넓을 때만 — 좁은 카드에 막대가 여럿이면
    숫자끼리 겹쳐 오히려 하나도 못 읽는다. 시리즈가 여럿이면 어느 막대의 값인지
    헷갈리므로 붙이지 않는다(CLAUDE.md).

    칸 폭은 창의 정원(`plot.size`)이 아니라 **실제로 그려지는 막대 수**로 나눈다 —
    범주가 정원보다 적으면 남는 자리까지 막대가 벌어져 선다.
  */
  const drawn = Math.min(plot.size, frame.rows.length)
  const everyBar =
    !multi && (horizontal || (drawn > 0 && (plot.extent - VALUE_AXIS_W) / drawn >= labelW))
  const labeled = useMemo(
    () => (multi ? frame.rows : withSpotLabel(frame, everyBar)),
    [frame, multi, everyBar]
  )

  /*
    접힌 것을 카드에 알린다. 조용히 최대값 하나만 남으면 "왜 하나만 나오지?"가 된다.

    시리즈가 여럿일 때는 애초에 라벨을 안 붙이는 것이라 접힌 게 아니다. 정리 함수로
    `false`를 돌려보내야 차트 종류를 바꾸거나 표 보기로 갈 때 표시가 남지 않는다.
  */
  const folded = !multi && !everyBar
  useEffect(() => {
    onLabelsFolded?.(folded)
    return () => onLabelsFolded?.(false)
  }, [folded, onLabelsFolded])

  const rows = useMemo(
    () => labeled.slice(plot.start, plot.start + plot.size),
    [labeled, plot.start, plot.size]
  )
  // 막대는 길이가 곧 값이라 **언제나** 0에서 시작한다. 여기엔 예외가 없다.
  const domain = useMemo(
    () => valueDomain(frame, frame.series, { stacked, anchorZero: true }).domain,
    [frame, stacked]
  )
  const formatValue = useMemo(() => tickFormatFor(domain), [domain])

  return (
    // 가로 막대는 축이 뒤집힌다 — 아래가 값, 왼쪽이 범주. 기준선 값은 그 선이 놓인
    // 축의 이름에 붙으므로 이름도 함께 뒤집힌다.
    <AxisFrame
      xLabel={horizontal ? valueAxisName(frame) : axis.label}
      yLabel={horizontal ? axis.label : valueAxisName(frame)}
      plot={plot}
    >
      <ChartContainer config={config} className="absolute inset-0 aspect-auto">
        <BarChart
          data={rows}
          layout={horizontal ? "vertical" : "horizontal"}
          // 값 라벨이 막대 끝 바깥에 놓일 자리를 둔다. 가로 막대는 그 자리가 오른쪽
          // 여백이라 가장 긴 라벨에 맞춰 넓힌다 — 고정 폭이면 자릿수가 큰 값이 잘린다.
          margin={{
            ...MARGIN_VERTICAL,
            top: horizontal ? MARGIN_HORIZONTAL_TOP : MARGIN_VERTICAL.top,
            right: horizontal
              ? Math.max(MIN_RIGHT_MARGIN, labelW + RIGHT_MARGIN_PAD)
              : MARGIN_VERTICAL.right,
          }}
          barCategoryGap={BAR_CATEGORY_GAP}
        >
          <CartesianGrid
            stroke={GRID}
            strokeWidth={1}
            vertical={horizontal}
            horizontal={!horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                domain={domain}
                tickFormatter={formatValue}
              />
              <YAxis
                type="category"
                dataKey="x"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={CATEGORY_AXIS_WIDTH}
                tickFormatter={(value: string) => axis.format(value, CATEGORY_AXIS_MAX_CHARS)}
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
                tickFormatter={(value: string) => axis.format(value, axis.max)}
              />
              <YAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={VALUE_AXIS_WIDTH}
                domain={domain}
                tickFormatter={formatValue}
              />
            </>
          )}
          {/* 막대는 크로스헤어 없이 마크마다 툴팁. 커서는 아주 옅은 밴드만. */}
          <ChartTooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
            content={<ChartTooltipContent indicator="line" className={TOOLTIP_CLASS} />}
          />
          {multi && <ChartLegend content={<ChartLegendContent />} />}
          {frame.series.map((entry, index) => {
            // 누적은 맨 위 조각만 끝을 둥글게 한다. 중간 조각까지 둥글면 울퉁불퉁해진다.
            const outermost = !stacked || index === frame.series.length - 1
            return (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                stackId={stacked ? "a" : undefined}
                isAnimationActive={false}
                fill={seriesColor(index, multi)}
                maxBarSize={MAX_BAR_SIZE}
                // 데이터 끝만 둥글게, 베이스라인 쪽은 각지게.
                radius={
                  outermost
                    ? horizontal
                      ? [0, BAR_RADIUS, BAR_RADIUS, 0]
                      : [BAR_RADIUS, BAR_RADIUS, 0, 0]
                    : 0
                }
                // 누적 조각 사이는 테두리가 아니라 카드 색 틈으로 갈라놓는다.
                stroke={stacked ? SURFACE : undefined}
                strokeWidth={stacked ? STACK_GAP : 0}
                // 막대 끝에 값을 적는다 — 전부, 좁으면 최대값 하나(`everyBar`).
                label={
                  multi
                    ? undefined
                    : {
                        ...SPOT_LABEL,
                        position: horizontal ? "right" : "top",
                        offset: SPOT_OFFSET,
                      }
                }
              />
            )
          })}
          {referenceLines(frame, horizontal)}
        </BarChart>
      </ChartContainer>
    </AxisFrame>
  )
}
