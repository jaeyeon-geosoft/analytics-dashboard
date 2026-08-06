import { CLAIM_THRESHOLD, SAMPLE_SIZE } from "@/shared/lib/infer-types/constants"
import { countDistinct } from "@/shared/lib/infer-types/count-distinct"
import { isDate, isMissing, isNumber } from "@/shared/lib/infer-types/parse-value"
import type { ColumnInfo, ColumnType } from "@/shared/lib/infer-types/types"

/**
 * 컬럼마다 타입을 추론한다. **틀릴 수 있다** — 그래서 결과를 사용자가 고칠 수 있게
 * 하고(`ColumnInfo.type`), 왜 못 미더운지까지 알린다(`columnWarning`).
 */
export function inferColumns(columnNames: string[], rows: Record<string, string>[]): ColumnInfo[] {
  const stride = Math.max(1, Math.floor(rows.length / SAMPLE_SIZE))

  return columnNames.map((name) => {
    let sampled = 0
    let dates = 0
    let numbers = 0

    for (let i = 0; i < rows.length && sampled < SAMPLE_SIZE; i += stride) {
      const value = rows[i]?.[name]
      if (typeof value !== "string" || isMissing(value)) continue
      sampled += 1
      // 날짜를 먼저 본다. 20260730 같은 값은 숫자로도 읽히기 때문이다.
      if (isDate(value)) dates += 1
      else if (isNumber(value)) numbers += 1
    }

    const distinct = countDistinct(name, rows)

    if (sampled === 0) {
      return {
        name,
        type: "category",
        inferred: "category",
        confidence: 0,
        sampled: 0,
        ...distinct,
      }
    }

    const dateRatio = dates / sampled
    const numberRatio = numbers / sampled

    let inferred: ColumnType
    let confidence: number
    if (dateRatio >= CLAIM_THRESHOLD && dateRatio >= numberRatio) {
      inferred = "date"
      confidence = dateRatio
    } else if (numberRatio >= CLAIM_THRESHOLD) {
      inferred = "number"
      confidence = numberRatio
    } else {
      inferred = "category"
      // 숫자·날짜가 섞여 있을수록 범주라는 확신도 떨어진다.
      confidence = 1 - Math.max(dateRatio, numberRatio)
    }

    return { name, type: inferred, inferred, confidence, sampled, ...distinct }
  })
}
