import { useEffect, useMemo, useRef, useState } from "react"

import type { ChartFrame } from "@/shared/lib/aggregate"

/**
 * X축 눈금을 **몇 개 찍을지 폭에서 정한다.**
 *
 * 개수를 고정하면 좁은 카드에서 라벨이 서로 겹쳐 눈금이 통째로 뭉갠다 — 12개로
 * 박아뒀더니 6칸 카드(플롯 ~700px)에서 타임스탬프가 다 겹쳤다. 같은 12개가 8칸
 * 카드에서는 멀쩡히 읽혔으니 폭만의 문제다.
 *
 * **`interval`은 그래도 숫자로 넘겨야 한다.** Recharts에 맡기면 어느 눈금을 감출지
 * 정하려고 모든 라벨의 폭을 재는데, 시계열은 점이 3,000개라 95초를 잡아먹었다.
 * 그래서 폭은 우리가 재고 결과는 숫자 하나로 준다.
 *
 * 라벨 폭은 글자로 어림한다 — 실제로 재려면 결국 Recharts가 하던 그 일이 된다.
 * 한글은 11px 글꼴에서 대략 정사각형이고 숫자·영문은 그 절반쯤이다.
 */
const TICK_FONT = 10
const TICK_GAP = 12
const MAX_TICKS = 12

/** 이 코드포인트 위는 전각으로 본다(CJK 시작 언저리). */
const WIDE_CHAR_FROM = 0x2e80
/** 라틴·숫자는 글꼴 크기의 이만큼으로 어림한다. */
const NARROW_RATIO = 0.56

/** 라벨 폭을 잴 때 훑을 표본 수. 눈금은 등간격이고 잘린 라벨은 길이가 고만고만하다. */
const WIDTH_SAMPLES = 40

export function useTickInterval(
  rows: ChartFrame["rows"],
  format: (value: string, max: number) => string,
  max: number
) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = measureRef.current
    if (!element) return
    // 이 상자는 스크롤하지 않는다. 스크롤하는 상자를 재면 스크롤바 유무로 폭이
    // 진동해 재측정이 되먹임에 빠진다(CLAUDE.md).
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const labelWidth = useMemo(() => {
    const step = Math.max(1, Math.floor(rows.length / WIDTH_SAMPLES))
    let widest = 0
    for (let i = 0; i < rows.length; i += step) {
      let px = 0
      for (const ch of format(String(rows[i].x), max)) {
        px += ch.charCodeAt(0) > WIDE_CHAR_FROM ? TICK_FONT : TICK_FONT * NARROW_RATIO
      }
      if (px > widest) widest = px
    }
    return widest
  }, [rows, format, max])

  // 아직 못 쟀으면 종전 값(12)으로 그린다. 다음 프레임에 제자리를 찾는다.
  const fits =
    width > 0 && labelWidth > 0 ? Math.floor(width / (labelWidth + TICK_GAP)) : MAX_TICKS
  const ticks = Math.max(1, Math.min(MAX_TICKS, fits))

  return { measureRef, interval: Math.max(0, Math.ceil(rows.length / ticks) - 1) }
}
