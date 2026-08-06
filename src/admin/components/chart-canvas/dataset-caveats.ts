import { datasetLabel, type AdminDataset } from "@/admin/lib/canvas-state"
import { MAX_ROWS } from "@/admin/lib/parse-file"

/**
 * 파일 단위 경고. 카드마다 반복하면 같은 문장을 네 번 읽게 된다.
 *
 * 파일이 여럿이면 어느 파일의 경고인지 밝힌다 — 하나면 이름이 이미 바 위에 있다.
 * 같은 파일의 다른 시트끼리는 이름이 같으므로 `datasetLabel`이 시트까지 적는다.
 */
export function datasetCaveats(datasets: AdminDataset[]): string[] {
  const single = datasets.length === 1
  return datasets.flatMap((dataset) =>
    [
      dataset.data.truncated && `상한 ${MAX_ROWS.toLocaleString()}행까지만 읽었습니다.`,
      dataset.data.errorCount > 0 &&
        `${dataset.data.errorCount.toLocaleString()}개 행이 헤더와 모양이 달랐습니다.`,
    ]
      .filter((note): note is string => typeof note === "string")
      .map((note) => (single ? note : `${datasetLabel(dataset)}: ${note}`))
  )
}
