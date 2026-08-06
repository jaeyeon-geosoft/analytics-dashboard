import { Cell, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart"
import {
  PIE_INNER_RADIUS,
  PIE_LABEL_MAX_CHARS,
  PIE_OUTER_RADIUS,
  PIE_PADDING_ANGLE,
  STACK_GAP,
  TOOLTIP_CLASS,
} from "@/shared/components/chart-view/constants"
import { OTHER_LABEL, type ChartFrame } from "@/shared/lib/aggregate"
import { truncate } from "@/shared/lib/axis-labels"
import { GRID, OTHER_FILL, SLOTS, SURFACE } from "@/shared/lib/chart-colors"

const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 }

/** 조각 라벨은 텍스트 색을 입어야 한다. Recharts가 조각 색을 물려주는 것을 CSS로 덮는다. */
const LABEL_OVERRIDE =
  "[&_.recharts-pie-label-text]:fill-muted-foreground [&_.recharts-pie-label-text]:text-[11px]"

/** "기타"는 엔티티가 아니라 나머지를 접은 자리라서 슬롯 색을 받지 않는다. */
function sliceColor(row: Record<string, string | number>, index: number): string {
  return row.x === OTHER_LABEL ? OTHER_FILL : SLOTS[index]
}

export function PieView({ frame }: { frame: ChartFrame }) {
  // 원형은 시리즈로 쪼개지 않는다 — 조각이 곧 범주다.
  const valueKey = frame.series[0]?.key
  if (!valueKey) return null

  const config: ChartConfig = Object.fromEntries(
    frame.rows.map((row, index) => [
      String(row.x),
      { label: String(row.x), color: sliceColor(row, index) },
    ])
  )

  return (
    <ChartContainer
      config={config}
      // Recharts는 조각 라벨에 조각 색을 물려준다. 라벨은 텍스트 색을 입어야 해서
      // (라이트 모드에서 노랑·아쿠아는 읽히지 않는다) CSS로 덮어쓴다 —
      // CSS fill이 SVG 표현 속성보다 우선한다.
      className={`absolute inset-0 aspect-auto ${LABEL_OVERRIDE}`}
    >
      <PieChart margin={MARGIN}>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="x" indicator="line" className={TOOLTIP_CLASS} />}
        />
        <Pie
          data={frame.rows}
          dataKey={valueKey}
          nameKey="x"
          innerRadius={PIE_INNER_RADIUS}
          outerRadius={PIE_OUTER_RADIUS}
          // 조각 사이 2px는 카드 색으로 벌린다. 테두리를 그리지 않는다.
          paddingAngle={PIE_PADDING_ANGLE}
          stroke={SURFACE}
          strokeWidth={STACK_GAP}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${truncate(String(name ?? ""), PIE_LABEL_MAX_CHARS)} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: GRID }}
        >
          {frame.rows.map((row, index) => (
            <Cell key={String(row.x)} fill={sliceColor(row, index)} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="x" />} />
      </PieChart>
    </ChartContainer>
  )
}
