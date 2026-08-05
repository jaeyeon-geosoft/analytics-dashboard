import type { ChartSpec } from "@/shared/lib/chart-spec"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import type { ParsedFile } from "@/admin/lib/parse-file"

/**
 * 열어둔 파일 하나. 계약의 `DashboardDataset`에 그대로 대응하고, 거기 없는 것
 * (원본 파일 참조·크기)만 더 들고 있다 — 그 둘은 어드민이 다시 읽고 화면에 쓰는 데만
 * 필요하고 뷰어는 알 필요가 없다.
 */
export type AdminDataset = {
  /** 내보낼 때 `datasetId`가 된다. */
  id: string
  name: string
  size: number
  /**
   * 시트·헤더 행을 바꾸면 같은 파일을 그 설정으로 다시 읽어야 해서 들고 있는다.
   * 데이터가 아니라 참조다.
   */
  source: File
  data: ParsedFile
  /** 추론 결과 + 사용자가 고친 타입. **파일마다 따로다.** */
  columns: ColumnInfo[]
}

/**
 * 파일을 읽는 동안만 차는 자리.
 *
 * 열어둔 파일들과 **따로** 둔다. 한 덩어리로 묶으면 두 번째 파일을 열다 실패했을 때
 * 첫 번째까지 화면에서 사라진다.
 */
export type OpenState =
  | { status: "idle" }
  | { status: "loading"; fileName: string }
  | { status: "error"; fileName?: string; message: string }

/**
 * 카드 한 장 — 무엇을 그리나(`spec`) + 어느 파일을 보나(`datasetId`).
 *
 * `datasetId`를 `ChartSpec` 안에 넣지 않는다. 계약(`DashboardChart`)도 `spec` 바깥에
 * 두고 있어서, 넣으면 같은 값이 두 군데 생기고 어긋날 수 있다.
 */
export type AdminChart = {
  spec: ChartSpec
  datasetId: string
}

// 세션 안에서만 겹치지 않으면 된다. 번호가 그대로 드러나 디버깅도 쉽다(`chart-spec.ts`와 같은 방식).
let counter = 0

export function createDataset(file: File, data: ParsedFile, columns: ColumnInfo[]): AdminDataset {
  counter += 1
  return { id: `ds-${counter}`, name: file.name, size: file.size, source: file, data, columns }
}
