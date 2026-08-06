import { ReferenceLine } from "recharts"

import type { ChartFrame } from "@/shared/lib/aggregate"
import { SURFACE, TEXT } from "@/shared/lib/chart-colors"

/** 후광은 파선보다 두꺼워야 마크에서 떨어져 보인다. */
const HALO_WIDTH = 4
const LINE_WIDTH = 1.5
const DASH = "4 4"

/**
 * 기준선.
 *
 * 파선인 것은 dataviz의 "격자선을 점선으로 긋지 말 것"과 어긋나지 않는다 — 그 규칙은
 * **그냥 격자선인데** 임계값처럼 읽히는 걸 막는 것이라, 진짜 임계선은 파선이 맞다.
 * 색은 시리즈 슬롯을 쓰지 않는다: 기준선은 엔티티가 아니라 주석이고, 빨강을 쓰면
 * "나쁨"이라는 없는 의미가 붙는다.
 *
 * Recharts가 자식 엘리먼트를 직접 훑기 때문에 컴포넌트로 감쌀 수 없다. 배열로 돌려준다.
 */
export function referenceLines(frame: ChartFrame, horizontal: boolean) {
  if (!frame.reference) return null
  // 기준선은 언제나 **값 축** 위에 선다. 가로 막대는 축이 뒤집혀 값이 가로다.
  // 두 갈래의 합집합을 그대로 두면 Recharts의 제네릭이 한쪽으로 좁혀져 안 맞는다.
  const at = horizontal ? { x: frame.reference.value } : { y: frame.reference.value }
  return [
    // 카드 색을 먼저 깔아 마크에서 떼어 놓는다 — 겹치는 점의 링, 누적 조각 사이의 틈과
    // 같은 방식이다. 이게 없으면 채도 높은 막대 위에서 파선이 묻힌다.
    <ReferenceLine key="halo" {...at} stroke={SURFACE} strokeWidth={HALO_WIDTH} />,
    // 격자선은 뒤로 물러나야 하지만 기준선은 다르다 — 읽으라고 있는 주석이라 텍스트 색이다.
    <ReferenceLine
      key="line"
      {...at}
      stroke={TEXT}
      strokeWidth={LINE_WIDTH}
      strokeDasharray={DASH}
    />,
  ]
}
