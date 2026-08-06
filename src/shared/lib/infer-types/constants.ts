/** 고유값은 이만큼만 센다. 시리즈 후보 판정에는 이 위로 정확한 수가 필요 없다. */
export const DISTINCT_CAP = 50

/** 전수 검사할 필요 없다. 앞쪽만 보면 편향되므로 전체에 걸쳐 띄엄띄엄 뽑는다. */
export const SAMPLE_SIZE = 200

/** 이 타입이라고 주장하려면 샘플의 이만큼은 맞아야 한다. */
export const CLAIM_THRESHOLD = 0.8

/** 이 아래면 값이 섞여 있다는 뜻이라 사용자에게 알린다. */
export const LOW_CONFIDENCE = 0.9

/** 값이 비었다고 볼 표기들. 파일마다 쓰는 말이 달라서 목록으로 둔다. */
export const MISSING = new Set(["", "-", "na", "n/a", "null", "nan", "none", "없음"])

/** 천 단위 쉼표, 통화 기호, 퍼센트, 공백은 벗겨내고 본다. */
export const NUMERIC_NOISE = /[\s,₩$€¥£%]/g

/** 선행 0이 붙은 정수. 우편번호·사번·전화번호라 숫자로 보면 0이 날아간다. */
export const LEADING_ZERO_INTEGER = /^0\d[\d,]*$/

/**
 * `new Date()`에 맡기지 않는다. 그건 "1"이나 "서울"도 받아들이거나 브라우저마다
 * 다르게 해석한다. 확실히 알아볼 수 있는 형태만 날짜로 본다.
 */
export const DATE_PATTERNS = [
  /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, // 2026-07-30, 2026/7/30, ISO 접두
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/, // 2026년 7월 30일
  /^(\d{4})(\d{2})(\d{2})$/, // 20260730
  /^(\d{4})[-/](\d{1,2})$/, // 2026-07 — 마침표는 소수점과 헷갈려서 뺀다
]

/** 연·월·일이 실제로 있을 수 있는 값인지. 패턴만 맞고 범위가 틀린 값을 막는다. */
export const MIN_YEAR = 1900
export const MAX_YEAR = 2200
