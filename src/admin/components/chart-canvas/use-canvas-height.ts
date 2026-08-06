import { useEffect, useRef, useState } from "react"

/**
 * 캔버스가 얼마나 높은지. 카드가 한 장일 때 **세로도 채우려면** 이 값이 필요하다.
 *
 * **재는 것은 스크롤 뷰포트다**(카드가 아니라). 뷰포트 높이는 내용과 무관하게 화면에서
 * 정해지므로 카드 높이가 뷰포트를 다시 바꾸는 되먹임이 없다 — 폭을 재는 상자를 스크롤
 * 안쪽에 두지 않는 것과 같은 이유다(CLAUDE.md).
 *
 * `enabled`는 그 상자가 화면에 있는지다. 빈 상태에서는 아예 없으므로, 파일이 열려
 * 상자가 생긴 뒤에 다시 건다.
 */
export function useCanvasHeight(enabled: boolean) {
  const viewport = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled])

  return { viewport, height }
}
