import type { AdminDataset } from "@/admin/lib/canvas-state"
import { columnWarning } from "@/shared/lib/infer-types"

/**
 * 파일 하나에 대해 사용자가 확인해야 할 것들. 접혀 있어도 ⚠로 보인다.
 *
 * 세는 기준(`columnWarning`)은 컬럼 목록과 **같은 곳**이다 — 여기서 따로 세면 한쪽이
 * "확인할 컬럼 2개"라고 하는 동안 다른 쪽이 다른 컬럼에 표시를 단다.
 */
export function fileNotes(dataset: AdminDataset): string[] {
  const uncertain = dataset.columns.filter((column) => columnWarning(column) !== null).length
  return [
    dataset.data.truncated && "행 상한에 걸려 뒷부분을 읽지 않았습니다.",
    dataset.data.errorCount > 0 &&
      `${dataset.data.errorCount.toLocaleString()}개 행이 헤더와 모양이 다릅니다.`,
    uncertain > 0 && `컬럼 ${uncertain}개의 타입을 확인해 주세요.`,
  ].filter((note): note is string => typeof note === "string")
}
