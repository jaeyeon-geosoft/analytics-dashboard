import type { ChartFrame, ChartSeries } from "@/shared/lib/aggregate"
import { niceCeil } from "@/shared/lib/number-format"

/**
 * 0을 껴 넣은 축에서 데이터가 이만큼도 차지하지 못하면 선의 모양을 읽을 수 없다.
 *
 * 눈대중이 아니다 — 플롯 높이가 250px일 때 10%는 25px이고, 그건 눈금 한 칸도 못
 * 움직이는 변화다. 실제로 겪은 것은 훨씬 심했다: 누적 항해거리가 12,480~12,540을
 * 오가는데 축이 0~20,000으로 잡혀 데이터가 축의 **0.3%**만 차지했고, 선은 완전한
 * 일직선으로 그려졌다.
 */
const FLAT_RATIO = 0.1

/** 축을 좁힐 때 데이터 양옆에 두는 여유(변화폭 대비). */
const PAD_RATIO = 0.05

export type ValueAxis = {
  domain: [number, number] | undefined
  /** 축이 0에서 시작하지 않는다. 축 이름에 밝혀야 한다 — 조용히 자르면 오독한다. */
  offset: boolean
}

/**
 * 값 축의 범위. 창을 옮길 때마다 축이 다시 잡히면 창끼리 비교가 거짓말이 되므로
 * **보이는 창이 아니라 전체**를 기준으로 고정한다.
 *
 * **막대는 언제나 0에서 시작한다**(`anchorZero`). 막대는 길이가 곧 값이라 0에서
 * 끊으면 "2배"가 "5배"로 보인다 — 이건 타협할 수 없다.
 *
 * **선·영역은 다르다.** 값은 길이가 아니라 점의 위치이고, 정보는 선의 **모양**이다.
 * 산점도·궤적은 이미 같은 이유로 예외다. 그래서 선·영역에서는 0을 끼웠을 때 변화가
 * 읽히지 않을 때에 한해 축을 데이터 범위로 좁히고, **좁혔다는 사실을 축 이름에 적는다.**
 */
export function valueDomain(
  frame: ChartFrame,
  series: ChartSeries[],
  { stacked = false, anchorZero }: { stacked?: boolean; anchorZero: boolean }
): ValueAxis {
  let peak = Number.NEGATIVE_INFINITY
  let floor = Number.POSITIVE_INFINITY

  for (const row of frame.rows) {
    if (stacked) {
      let total = 0
      for (const entry of series) total += Number(row[entry.key]) || 0
      if (total > peak) peak = total
      if (total < floor) floor = total
    } else {
      for (const entry of series) {
        const value = Number(row[entry.key])
        if (!Number.isFinite(value)) continue
        if (value > peak) peak = value
        if (value < floor) floor = value
      }
    }
  }
  if (!Number.isFinite(peak) || !Number.isFinite(floor)) return { domain: undefined, offset: false }

  // 0을 포함한 축. 음수가 있으면 바닥도 0 아래로 내려간다 — 예전에는 하한을 0으로
  // 박아서 **음수가 통째로 잘려 나갔다.**
  const zeroTop = niceCeil(Math.max(peak, 0))
  const zeroBottom = -niceCeil(Math.max(-floor, 0))
  const zeroed: ValueAxis = {
    domain: zeroTop > zeroBottom ? [zeroBottom, zeroTop] : undefined,
    offset: false,
  }
  if (anchorZero) return zeroed

  const span = peak - floor
  const height = zeroTop - zeroBottom
  // 0을 껴도 읽히면 그대로 둔다. 굳이 축을 띄울 이유가 없다.
  if (span <= 0 || height <= 0 || span / height >= FLAT_RATIO) return zeroed

  // 눈금이 될 만한 단위로 바깥쪽으로 떨어뜨린다. 값의 크기가 아니라 **변화폭**의
  // 크기로 잡아야 한다 — 12,480에 10^4를 쓰면 10,000으로 떨어져 다시 평평해진다.
  const step = 10 ** Math.floor(Math.log10(span))
  const pad = span * PAD_RATIO
  return {
    domain: [Math.floor((floor - pad) / step) * step, Math.ceil((peak + pad) / step) * step],
    offset: true,
  }
}
