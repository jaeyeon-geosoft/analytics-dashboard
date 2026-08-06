/**
 * rAF를 `count`번 양보한 뒤 실행한다. 정리 함수를 돌려주므로 effect에서 그대로
 * `return`하면 된다.
 *
 * 집계와 Recharts 렌더는 둘 다 동기라서, 범주가 만 개쯤 되면 그동안 화면이 통째로
 * 멈춘다. 계산을 미뤄서 "그리는 중"이 먼저 찍히게 하는 것이 목적이다. **한 번만
 * 양보하면 같은 프레임에 묶여 표시가 보이지 않으므로 최소 두 번**이다.
 */
export function afterFrames(count: number, run: () => void): () => void {
  let remaining = count
  let cancelled = false
  let frame = requestAnimationFrame(function step() {
    if (cancelled) return
    if (remaining-- > 0) {
      frame = requestAnimationFrame(step)
      return
    }
    run()
  })
  return () => {
    cancelled = true
    cancelAnimationFrame(frame)
  }
}

/** 표시가 보이려면 이만큼은 양보해야 한다. 한 번은 같은 프레임에 묶인다. */
export const MIN_YIELD_FRAMES = 2
