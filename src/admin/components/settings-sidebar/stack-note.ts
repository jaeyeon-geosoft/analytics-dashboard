/**
 * 여럿 고르는 슬롯 아래에 붙는 한 줄.
 *
 * 목록만 있으면 두 가지를 알 수 없다 — **어느 것이 아래 층인지**, 그리고 **왜 더는
 * 못 고르는지**. 둘 다 눌러본 뒤에야 알게 두지 않는다. 한 줄만 쓰는 것은 슬롯마다
 * 설명이 두 줄씩 붙으면 사이드바가 설명문이 되기 때문이고, 그래서 더 급한 쪽(막힌
 * 이유)이 먼저다.
 */
export function stackNote(chosen: number, max: number): string | null {
  if (chosen >= max) {
    return max === 1
      ? "누적 기준을 쓰는 동안에는 하나만 고릅니다"
      : `색 슬롯이 ${max}개라 여기까지입니다`
  }
  return chosen > 1 ? "위쪽이 아래 층입니다" : null
}
