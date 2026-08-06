import type { ChartSpec } from "@/shared/lib/chart-spec"
import type { DataFrame } from "@/shared/lib/dataset"
import type { ColumnInfo } from "@/shared/lib/infer-types"

/**
 * 어드민이 만들고 뷰어가 그리는 것. **백엔드와의 계약이기도 하다** —
 * 지금은 JSON 파일로 오가지만 API가 붙으면 그대로 응답 본문이 된다.
 * 모양을 바꾸면 서버도 같이 바꿔야 하니 함부로 늘리지 말 것.
 */
export type Dashboard = {
  format: number
  id: string
  title: string
  /**
   * 파일 단위로 한 번만 담는다. 차트 여럿이 같은 파일을 봐도 데이터는 1벌이다 —
   * 차트마다 안고 있으면 10만 행짜리가 장 수만큼 불어난다.
   */
  datasets: DashboardDataset[]
  charts: DashboardChart[]
}

export type DashboardDataset = {
  id: string
  /** 파일 이름. 차트가 어느 파일에서 나왔는지 화면에 밝히는 데 쓴다. */
  name: string
  /**
   * 타입 추론 결과. **반드시 함께 보낸다.** 정렬 규칙과 매핑 후보가 컬럼 타입을
   * 보고 갈리는데, 사용자가 어드민에서 추론을 고쳤을 수 있다. 뷰어에서 다시
   * 추론하면 어드민에서 본 것과 다른 차트가 나온다(절대 원칙 1).
   */
  columns: ColumnInfo[]
  data: DataFrame
}

/** 그리드 칸 단위. 배치는 어드민에서 정하고 뷰어는 그대로 그린다. */
export type DashboardLayout = { x: number; y: number; w: number; h: number }

export type DashboardChart = {
  id: string
  title: string
  datasetId: string
  spec: ChartSpec
  layout: DashboardLayout
}

export type ParseResult = { ok: true; dashboard: Dashboard } | { ok: false; reason: string }
