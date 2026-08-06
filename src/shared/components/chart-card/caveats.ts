import { CROWDED } from "@/shared/components/chart-card/constants"
import type { PlotData } from "@/shared/lib/aggregate"
import type { ChartType } from "@/shared/lib/chart-types"
import { isTimeline } from "@/shared/lib/mapping-slots"

/** 값 라벨이 최대값 하나로 접혔을 때. 조용히 하나만 남으면 "왜 하나만 나오지?"가 된다. */
export const FOLDED_LABELS_NOTE =
  "칸이 좁아 값은 가장 큰 막대에만 적었습니다. 카드를 넓히거나 표 보기로 나머지를 보세요."

/**
 * 이 카드에만 해당하는 경고. 파일 단위 경고는 캔버스의 요약 바가 맡는다.
 *
 * 상한에 걸려 뺀 것은 반드시 알린다(CLAUDE.md) — 100만 행을 마크 몇 개로 줄여놓고
 * 어떻게 줄였는지 안 쓰면 조용히 오독하게 만든다.
 */
export function caveatsFor(plot: PlotData, chartType: ChartType): string[] {
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
