import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts"

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
  AXIS_TICK,
  TOOLTIP_CLASS,
  VALUE_AXIS_WIDTH,
} from "@/shared/components/chart-view/constants"
import type { ScatterFrame } from "@/shared/lib/aggregate"
import { GRID, SURFACE, seriesColor } from "@/shared/lib/chart-colors"
import { compact } from "@/shared/lib/number-format"

const MARGIN = { top: 8, right: 16, bottom: 4, left: 4 }

/** 겹치는 점을 떼어 놓는 카드 색 링의 두께. */
const RING_WIDTH = 2

/** 궤적의 선. 색은 Recharts가 마크의 `fill`에서 가져가므로 여기서 주지 않는다. */
const PATH_LINE = { strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const

/**
 * 산점도 · 궤적. 행 하나가 점 하나라 집계가 없고, 창으로 자르지도 않는다
 * (자르면 관계 자체가 달라진다 — 상한을 넘는 행은 집계 쪽에서 버리고 그 수를 알린다).
 */
export function ScatterView({ frame, connected }: { frame: ScatterFrame; connected?: boolean }) {
  const config = configFor(frame.series)
  const multi = frame.series.length > 1

  return (
    <AxisFrame xLabel={frame.xLabel} yLabel={frame.yLabel}>
      <ChartContainer config={config} className="absolute inset-0 aspect-auto">
        <ScatterChart margin={MARGIN}>
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
            tickFormatter={(value) => compact(value)}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={frame.yLabel}
            domain={["auto", "auto"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={VALUE_AXIS_WIDTH}
            tickFormatter={(value) => compact(value)}
          />
          {/*
            ZAxis로 점 크기를 지정하지 않는다. Recharts 3에서 dataKey 없는 range는
            반지름 1px 미만으로 뭉개져 2px 링에 완전히 덮인다. 기본값(면적 64)이
            r≈4.5 = 지름 9px라 "마커 8px 이상"을 그대로 만족한다.
          */}
          <ChartTooltip
            cursor={{ strokeDasharray: "0", stroke: GRID }}
            content={<ChartTooltipContent indicator="line" className={TOOLTIP_CLASS} />}
          />
          {multi && <ChartLegend content={<ChartLegendContent />} />}
          {frame.series.map((entry, index) => (
            <Scatter
              key={entry.key}
              name={entry.label}
              data={entry.points}
              fill={seriesColor(index, multi)}
              // 겹치는 점은 카드 색 링으로 떼어 놓는다.
              stroke={SURFACE}
              strokeWidth={RING_WIDTH}
              /*
                궤적은 점을 데이터 순서대로 직선으로 잇는다(Recharts 기본
                `lineType: "joint"` + `lineJointType: "linear"`). 선 색은 Recharts가
                이 마크의 `fill`에서 가져가므로 여기서 다시 주지 않는다 — 위의
                `stroke`는 링 색이라 그대로 넘어가면 선이 카드 색으로 사라진다.
              */
              line={connected ? PATH_LINE : false}
            />
          ))}
        </ScatterChart>
      </ChartContainer>
    </AxisFrame>
  )
}
