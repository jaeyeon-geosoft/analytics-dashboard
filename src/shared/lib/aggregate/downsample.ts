import { MAX_TIMELINE_POINTS } from "@/shared/lib/aggregate/constants"
import type { ChartSeries } from "@/shared/lib/aggregate/types"

/**
 * 화면에 그릴 만큼으로 줄인다.
 *
 * 구간마다 **최솟값·최댓값 행을 남긴다.** 등간격으로 솎으면 한 점짜리 스파이크가 통째로
 * 사라지는데, 장비 로그에서는 그 튐이 찾으려는 것 자체다(22초 지연 한 번이 그렇다).
 * 남기는 것은 원본 행이라 라벨·툴팁·표는 그대로다.
 */
export function downsample(
  rows: Record<string, string | number>[],
  series: ChartSeries[]
): Record<string, string | number>[] {
  if (rows.length <= MAX_TIMELINE_POINTS) return rows

  const buckets = Math.floor(MAX_TIMELINE_POINTS / 2)
  const span = rows.length / buckets
  // 양 끝은 무조건 남긴다 — 시계열의 시작과 끝이 잘리면 기간 자체가 달라 보인다.
  const keep = new Set<number>([0, rows.length - 1])

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const from = Math.floor(bucket * span)
    const to = Math.min(rows.length, Math.floor((bucket + 1) * span))
    let lowAt = from
    let highAt = from
    let low = Infinity
    let high = -Infinity
    for (let index = from; index < to; index += 1) {
      for (const entry of series) {
        const value = Number(rows[index][entry.key] ?? 0)
        if (value < low) {
          low = value
          lowAt = index
        }
        if (value > high) {
          high = value
          highAt = index
        }
      }
    }
    keep.add(lowAt)
    keep.add(highAt)
  }

  return [...keep].sort((a, b) => a - b).map((index) => rows[index])
}
