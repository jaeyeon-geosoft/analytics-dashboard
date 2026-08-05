export type ColumnType = "number" | "date" | "category"

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  number: "숫자",
  date: "날짜",
  category: "범주",
}

export type ColumnInfo = {
  name: string
  /** 현재 타입. 사용자가 고쳤을 수 있다. */
  type: ColumnType
  /** 추론 원본. `type`과 다르면 사용자가 손댄 것이다. */
  inferred: ColumnType
  /** 샘플 중 추론된 타입으로 읽힌 비율 (0~1). 낮으면 값이 섞여 있다는 뜻. */
  confidence: number
  /** 실제로 들여다본 값의 개수. 0이면 컬럼이 통째로 비어 있다. */
  sampled: number
  /** 고유값 개수. `distinctCapped`면 세다 멈춘 값이라 "그 이상"이라는 뜻만 갖는다. */
  distinctCount: number
  distinctCapped: boolean
}

/** 고유값은 이만큼만 센다. 시리즈 후보 판정에는 이 위로 정확한 수가 필요 없다. */
const DISTINCT_CAP = 50

function countDistinct(name: string, rows: Record<string, string>[]) {
  const seen = new Set<string>()
  for (const row of rows) {
    const value = row[name]
    if (typeof value !== "string" || isMissing(value)) continue
    seen.add(value)
    // 고유값이 많은 컬럼일수록 여기서 일찍 빠져나온다.
    if (seen.size > DISTINCT_CAP) return { distinctCount: DISTINCT_CAP, distinctCapped: true }
  }
  return { distinctCount: seen.size, distinctCapped: false }
}

/** 전수 검사할 필요 없다. 앞쪽만 보면 편향되므로 전체에 걸쳐 띄엄띄엄 뽑는다. */
const SAMPLE_SIZE = 200

/** 이 타입이라고 주장하려면 샘플의 이만큼은 맞아야 한다. */
const CLAIM_THRESHOLD = 0.8

const MISSING = new Set(["", "-", "na", "n/a", "null", "nan", "none", "없음"])

function isMissing(value: string): boolean {
  return MISSING.has(value.trim().toLowerCase())
}

/** 천 단위 쉼표, 통화 기호, 퍼센트, 공백은 벗겨내고 본다. */
const NUMERIC_NOISE = /[\s,₩$€¥£%]/g

/** 숫자로 읽히면 그 값, 아니면 null. 추론과 집계가 같은 규칙을 쓰게 한다. */
export function toNumber(value: string): number | null {
  const stripped = value.trim().replace(NUMERIC_NOISE, "")
  if (stripped === "") return null
  const parsed = Number(stripped)
  return Number.isFinite(parsed) ? parsed : null
}

function isNumber(value: string): boolean {
  // 선행 0이 붙은 **정수**는 우편번호·사번·전화번호일 가능성이 높다. 숫자로 보면
  // 0이 날아가서 원본을 잃는다. 소수점이 있으면 그런 식별자가 아니므로
  // `03.1`까지 범주로 몰면 안 된다.
  if (/^0\d[\d,]*$/.test(value.trim())) return false
  return toNumber(value) !== null
}

/**
 * `new Date()`에 맡기지 않는다. 그건 "1"이나 "서울"도 받아들이거나 브라우저마다
 * 다르게 해석한다. 확실히 알아볼 수 있는 형태만 날짜로 본다.
 */
const DATE_PATTERNS = [
  /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, // 2026-07-30, 2026/7/30, ISO 접두
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/, // 2026년 7월 30일
  /^(\d{4})(\d{2})(\d{2})$/, // 20260730
  /^(\d{4})[-/](\d{1,2})$/, // 2026-07 — 마침표는 소수점과 헷갈려서 뺀다
]

/** 날짜로 읽히면 정렬에 쓸 수 있는 수, 아니면 null. */
export function toDateOrder(value: string): number | null {
  const trimmed = value.trim()
  for (const pattern of DATE_PATTERNS) {
    const match = pattern.exec(trimmed)
    if (!match) continue
    const year = Number(match[1])
    const month = Number(match[2])
    const day = match[3] === undefined ? 1 : Number(match[3])
    if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null
    return year * 10000 + month * 100 + day
  }
  return null
}

function isDate(value: string): boolean {
  return toDateOrder(value) !== null
}

export function inferColumns(
  columnNames: string[],
  rows: Record<string, string>[]
): ColumnInfo[] {
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

/** 이 아래면 값이 섞여 있다는 뜻이라 사용자에게 알린다. */
const LOW_CONFIDENCE = 0.9

/**
 * 이 컬럼의 추론을 왜 못 미더워하는지. 믿을 만하면 `null`.
 *
 * 규칙이 컬럼 목록과 파일 목록 배지 두 곳에서 필요해서 여기 둔다 — 컴포넌트에
 * 두면 한쪽이 "확인할 컬럼 2개"라고 세는 동안 다른 쪽이 다른 기준으로 표시한다.
 */
export function columnWarning(column: ColumnInfo): string | null {
  if (column.type !== column.inferred) return null // 사용자가 이미 손댔다
  // distinctCount는 전수, sampled는 띄엄띄엄 뽑은 것이라 둘을 구분해서 말해야 정확하다.
  if (column.distinctCount === 0) return "값이 모두 비어 있습니다. 차트에 쓸 수 없습니다."
  if (column.sampled === 0) {
    return "샘플에 값이 없었습니다. 대부분 비어 있는 컬럼이라 추론을 믿기 어렵습니다."
  }
  if (column.confidence >= LOW_CONFIDENCE) return null

  const percent = Math.round(column.confidence * 100)
  if (column.inferred === "category") {
    return `샘플의 ${100 - percent}%는 숫자나 날짜로도 읽힙니다. 우편번호·사번처럼 숫자로 보이는 범주인지 확인해 주세요.`
  }
  return `샘플의 ${percent}%만 ${COLUMN_TYPE_LABELS[column.inferred]}로 읽혔습니다. 값이 섞여 있는지 확인해 주세요.`
}
