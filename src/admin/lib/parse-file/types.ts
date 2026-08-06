import type { DataFrame } from "@/shared/lib/dataset"

/**
 * 읽어낸 표 하나.
 *
 * `DataFrame`(차트가 실제로 먹는 최소 형태)에 **파싱할 때만 의미 있는 것**을 얹은
 * 모양이라 그대로 대입된다 — 인코딩·시트·헤더 행은 뷰어가 알 필요가 없다.
 */
export type ParsedFile = DataFrame & {
  /** 실제로 디코딩에 쓴 인코딩. Excel은 해당 없어서 null. */
  encoding: string | null
  /** 상한에 걸려 뒷부분을 버렸는지 */
  truncated: boolean
  /** 컬럼 수가 헤더와 안 맞는 행의 수 */
  errorCount: number
  /** 워크북의 시트 이름들. CSV면 빈 배열. */
  sheets: string[]
  /** 실제로 읽은 시트 */
  sheet: string | null
  /** 헤더로 쓴 행 (1부터) */
  headerRow: number
  /** 헤더 행을 고르게 하려고 들고 있는 앞부분 원본 행 */
  preview: string[][]
}

export type ParseOptions = {
  sheet?: string
  /** 1부터. 이 행을 헤더로 쓰고 그 아래를 데이터로 본다. */
  headerRow?: number
}
