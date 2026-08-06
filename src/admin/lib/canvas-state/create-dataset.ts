import type { AdminDataset } from "@/admin/lib/canvas-state/types"
import type { ParsedFile } from "@/admin/lib/parse-file"
import type { ColumnInfo } from "@/shared/lib/infer-types"

const DATASET_ID_PREFIX = "ds-"
const FILE_ID_PREFIX = "file-"

// 세션 안에서만 겹치지 않으면 된다. 번호가 그대로 드러나 디버깅도 쉽다(`chart-spec`와 같은 방식).
let counter = 0

/**
 * `fileId`를 주면 그 파일의 **다른 시트**를 들이는 것이고, 안 주면 새로 연 파일이다.
 * 같은 파일을 파일 열기로 두 번 열면 각각 다른 `fileId`가 된다 — 사용자가 두 번 연
 * 것이니 목록에도 둘로 서는 편이 정직하다.
 */
export function createDataset(
  file: File,
  data: ParsedFile,
  columns: ColumnInfo[],
  fileId?: string
): AdminDataset {
  counter += 1
  return {
    id: `${DATASET_ID_PREFIX}${counter}`,
    fileId: fileId ?? `${FILE_ID_PREFIX}${counter}`,
    name: file.name,
    size: file.size,
    source: file,
    data,
    columns,
  }
}
