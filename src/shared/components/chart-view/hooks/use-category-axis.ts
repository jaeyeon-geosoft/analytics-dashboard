import { useMemo } from "react"

import type { ChartFrame } from "@/shared/lib/aggregate"
import { sharedPrefix, truncate, withPrefixNote } from "@/shared/lib/axis-labels"

/** 공통부를 뗀 라벨은 남은 글자가 전부 의미 있는 정보라 더 보여준다. */
const MAX_CHARS_WITH_PREFIX = 16
const MAX_CHARS = 10

export type CategoryAxis = {
  /** 축 이름. 떼어낸 공통부를 여기에 한 번만 적는다. */
  label: string
  /** 눈금 하나를 글자로. 공통부를 떼고 남은 것을 `max`자에서 자른다. */
  format: (value: string, max: number) => string
  /**
   * 가로로 놓인 눈금에 허용할 글자 수. 세로 축(가로 막대)은 폭이 고정이라 늘리지
   * 않는다 — 늘리면 플롯이 그만큼 좁아진다.
   */
  max: number
}

export function useCategoryAxis(frame: ChartFrame): CategoryAxis {
  const prefix = useMemo(() => sharedPrefix(frame.rows), [frame.rows])
  return useMemo(
    () => ({
      label: withPrefixNote(frame.xLabel, prefix),
      format: (value: string, max: number) => truncate(String(value).slice(prefix.length), max),
      max: prefix ? MAX_CHARS_WITH_PREFIX : MAX_CHARS,
    }),
    [frame.xLabel, prefix]
  )
}
