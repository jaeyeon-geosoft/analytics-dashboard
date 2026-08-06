import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"
import { AxisFrame } from "@/shared/components/chart-view/axis-frame"
import { configFor } from "@/shared/components/chart-view/chart-config"
import {
  ACTIVE_DOT,
  AXIS_TICK,
  TOOLTIP_CLASS,
  VALUE_AXIS_WIDTH,
} from "@/shared/components/chart-view/constants"
import { useCategoryAxis } from "@/shared/components/chart-view/hooks/use-category-axis"
import { useTickInterval } from "@/shared/components/chart-view/hooks/use-tick-interval"
import { referenceLines } from "@/shared/components/chart-view/reference-lines"
import type { ChartFrame } from "@/shared/lib/aggregate"
import { valueDomain } from "@/shared/lib/axis-domain"
import { valueAxisName, withOffsetNote } from "@/shared/lib/axis-labels"
import { GRID, SLOTS, SURFACE, TEXT, seriesColor } from "@/shared/lib/chart-colors"
import type { ChartType } from "@/shared/lib/chart-types"
import { labelNumber, tickFormatFor } from "@/shared/lib/number-format"

/** 최신값 라벨의 절반이 오른쪽으로 나간다. 시리즈가 하나일 때만 그 자리를 둔다. */
const MARGIN = { top: 24, right: 40, bottom: 4, left: 4 }
const MARGIN_MULTI = { ...MARGIN, right: 16 }

/** 오른쪽 축의 id. 왼쪽은 Recharts 기본 id를 그대로 써야 격자선이 살아 있다. */
const RIGHT_AXIS_ID = "right"

/**
 * 선·영역.
 *
 * **창으로 자르지 않는다.** 점이 몇 개든 `<path>` 하나라 노드가 늘지 않고, 자르면
 * 5시간짜리 파형의 모양을 영영 볼 수 없다. 점 수는 집계 쪽에서 이미 줄여 놓았다
 * (`downsample` — 구간마다 최소·최대를 남긴다).
 */
export function TimelineView({ frame, chartType }: { frame: ChartFrame; chartType: ChartType }) {
  const config = configFor(frame.series)
  const multi = frame.series.length > 1
  // 오른쪽 축에 놓인 시리즈가 있으면 이중 축이다(선 차트에서만 생긴다).
  const dual = frame.series.some((entry) => entry.axis === "right")
  const axis = useCategoryAxis(frame)
  const rows = frame.rows
  const { measureRef, interval: tickInterval } = useTickInterval(rows, axis.format, axis.max)

  /*
    축이 둘이면 범위도 축마다 따로 잡는다 — 한 스케일로 묶으면 오른쪽 축을 세운
    이유가 없어진다.

    예전에는 여기서 **둘 다 0에서 시작**하게 못 박았다. 두 축을 어긋나게 맞추면 선이
    교차하는 자리가 달라져 없는 상관관계가 보인다는 이유였는데, **그 가드레일은 실효가
    없었다.** 같은 값을 단위만 바꾼 두 컬럼(knots / km-h, 정확히 ×1.852)을 넣었더니
    두 축이 0~20과 0~30, 즉 1:1.5로 잡혀서 겹쳐야 할 두 선이 어긋나 보였다. 0에서
    시작했는데도 거짓 관계가 그려진 것이다.

    거짓말을 실제로 막는 것은 이미 있는 것들이다 — 범례의 (좌)/(우), 축 이름 옆의 색
    마크, 표 보기. 그래서 0 강제는 걷어내고 단일 축과 같은 규칙을 쓴다.
  */
  const [left, right] = useMemo(() => {
    if (!dual) return [valueDomain(frame, frame.series, { anchorZero: false }), undefined]
    const on = (side: "left" | "right") =>
      valueDomain(
        frame,
        frame.series.filter((entry) =>
          side === "right" ? entry.axis === "right" : entry.axis !== "right"
        ),
        { anchorZero: false }
      )
    return [on("left"), on("right")]
  }, [frame, dual])

  const leftDomain = left.domain
  const rightDomain = right?.domain
  const formatLeft = useMemo(() => tickFormatFor(leftDomain), [leftDomain])
  const formatRight = useMemo(() => tickFormatFor(rightDomain), [rightDomain])

  /*
    최신값 한 점에만 직접 라벨. 모든 점에 숫자를 찍으면 아무도 안 읽는다(CLAUDE.md).
    시리즈가 여럿이면 끝점이 서로 겹쳐 어느 선의 값인지 헷갈리므로 붙이지 않는다.

    막대 쪽이 쓰는 `LabelList`(`label` prop)를 여기서는 쓸 수 없다. 값이 한 점에만
    적혀도 **점마다 `<text>`를 하나씩** 만들어서, 3,002개가 생기며 렌더가 30초
    걸렸다(측정). `ReferenceDot`은 노드 하나로 끝난다.
  */
  const last = multi ? undefined : rows[rows.length - 1]
  const lastKey = frame.series[0]?.key
  const spot = last && lastKey !== undefined && (
    <ReferenceDot
      x={String(last.x)}
      y={Number(last[lastKey])}
      r={0}
      label={{
        value: labelNumber(last[lastKey]),
        position: "top",
        fill: TEXT,
        fontSize: 11,
        fontWeight: 500,
      }}
    />
  )

  const Chart = chartType === "line" ? LineChart : AreaChart

  return (
    <AxisFrame
      xLabel={axis.label}
      yLabel={withOffsetNote(valueAxisName(frame), left.offset)}
      yRightLabel={frame.y2Label && withOffsetNote(frame.y2Label, right?.offset ?? false)}
      colors={dual ? [SLOTS[0], SLOTS[1]] : undefined}
    >
      {/* 폭을 재는 상자. ChartContainer가 absolute라 잴 자리를 따로 둔다. */}
      <div ref={measureRef} className="absolute inset-0">
        <ChartContainer config={config} className="absolute inset-0 aspect-auto">
          <Chart data={rows} margin={multi ? MARGIN_MULTI : MARGIN}>
            <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
            {/*
              눈금 간격을 반드시 숫자로 준다. 안 주면 Recharts가 어느 눈금을 감출지
              정하려고 **모든 라벨의 폭을 잰다** — 창을 쓰는 막대에서는 40개뿐이라
              드러나지 않지만, 시계열 전체를 그리면 3,000개를 재느라 95초를 잡아먹었다.
            */}
            <XAxis
              dataKey="x"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval={tickInterval}
              tickFormatter={(value: string) => axis.format(value, axis.max)}
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
              width={VALUE_AXIS_WIDTH}
              domain={leftDomain}
              tickFormatter={formatLeft}
            />
            {dual && (
              <YAxis
                yAxisId={RIGHT_AXIS_ID}
                orientation="right"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={VALUE_AXIS_WIDTH}
                domain={rightDomain}
                tickFormatter={formatRight}
              />
            )}
            {/* 선·영역은 크로스헤어 + 한 번에 전 시리즈를 읽는 툴팁 */}
            <ChartTooltip
              cursor={{ stroke: GRID, strokeWidth: 1 }}
              content={<ChartTooltipContent indicator="line" className={TOOLTIP_CLASS} />}
            />
            {multi && <ChartLegend content={<ChartLegendContent />} />}
            {frame.series.map((entry, index) =>
              chartType === "line" ? (
                <Line
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  yAxisId={entry.axis === "right" ? RIGHT_AXIS_ID : undefined}
                  stroke={seriesColor(index, multi)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ ...ACTIVE_DOT, stroke: SURFACE }}
                />
              ) : (
                <Area
                  key={entry.key}
                  type="monotone"
                  dataKey={entry.key}
                  stackId={multi ? "a" : undefined}
                  isAnimationActive={false}
                  stroke={seriesColor(index, multi)}
                  strokeWidth={2}
                  fill={seriesColor(index, multi)}
                  fillOpacity={0.1}
                  activeDot={{ ...ACTIVE_DOT, stroke: SURFACE }}
                />
              )
            )}
            {spot}
            {referenceLines(frame, false)}
          </Chart>
        </ChartContainer>
      </div>
    </AxisFrame>
  )
}
