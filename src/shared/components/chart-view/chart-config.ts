import type { ChartConfig } from "@/shared/components/ui/chart"
import type { ChartSeries } from "@/shared/lib/aggregate"
import { seriesColor } from "@/shared/lib/chart-colors"

/** 범례·툴팁이 시리즈를 부르는 이름과 색. 색 배정은 `seriesColor` 한 곳에서 나온다. */
export function configFor(series: ChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((entry, index) => [
      entry.key,
      {
        // 축이 둘이면 범례가 어느 축의 선인지까지 말해야 한다. 색만으로는 왼쪽 눈금을
        // 읽어야 할지 오른쪽을 읽어야 할지 알 수 없다.
        label: entry.axis ? `${entry.label} (${entry.axis === "right" ? "우" : "좌"})` : entry.label,
        color: seriesColor(index, series.length > 1),
      },
    ])
  )
}
