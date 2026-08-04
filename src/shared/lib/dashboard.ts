import type { DataFrame } from "@/shared/lib/dataset"
import type { ChartSpec } from "@/shared/lib/chart-spec"
import type { ColumnInfo } from "@/shared/lib/infer-types"
// 아는 차트 종류의 목록으로 쓴다. `Record<ChartType, …>`라 종류가 늘면
// 타입 검사가 여기 채우기를 강제한다 — 따로 배열을 두면 조용히 어긋난다.
import { MAPPING_SLOTS } from "@/shared/lib/mapping-slots"

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

export type DashboardChart = {
  id: string
  title: string
  datasetId: string
  spec: ChartSpec
  /** 그리드 칸 단위. 배치는 어드민에서 정하고 뷰어는 그대로 그린다. */
  layout: { x: number; y: number; w: number; h: number }
}

/**
 * 계약이 바뀌면 올린다. 뷰어는 모르는 번호를 만나면 그리지 않고 그 사실을 말한다 —
 * 형식이 어긋난 채로 그리면 조용히 틀린 차트가 나온다.
 */
export const DASHBOARD_FORMAT = 1

/**
 * 그리드 규격. `layout`이 칸 단위라 **어드민과 뷰어가 같은 숫자를 봐야 한다** —
 * 한쪽만 바꾸면 같은 대시보드가 두 화면에서 다르게 배치된다(절대 원칙 1).
 * 바꾸면 이미 저장된 대시보드의 배치도 함께 움직이니 `DASHBOARD_FORMAT`을 올릴 것.
 */
export const GRID_COLS = 12
export const GRID_ROW_HEIGHT = 40
/** 카드 사이 간격(px). 어드민 캔버스의 `gap-3`과 같은 값이다. */
export const GRID_MARGIN = 12

export type ParseResult =
  | { ok: true; dashboard: Dashboard }
  | { ok: false; reason: string }

/**
 * 받은 것이 `Dashboard`인지 확인한다. 절대 원칙 3 — `ChartSpec` 타입이 서버와
 * 이 레포에 각각 있어서, 검증 없이 렌더러에 넘기면 서버가 바뀔 때 조용히 깨진다.
 *
 * 깊게 파지는 않는다. 렌더러가 스스로 처리하는 것(빈 매핑, 없는 컬럼 이름)까지
 * 여기서 막으면 규칙이 두 곳이 된다. **구조**와 **참조 무결성**만 본다.
 */
export function parseDashboard(input: unknown): ParseResult {
  if (!isRecord(input)) return fail("최상위가 객체가 아닙니다")

  if (input.format !== DASHBOARD_FORMAT) {
    return fail(`형식 버전이 ${DASHBOARD_FORMAT}이어야 합니다 (받은 값: ${describe(input.format)})`)
  }
  if (typeof input.id !== "string") return fail("id가 없습니다")
  if (typeof input.title !== "string") return fail("title이 없습니다")
  if (!Array.isArray(input.datasets)) return fail("datasets가 배열이 아닙니다")
  if (!Array.isArray(input.charts)) return fail("charts가 배열이 아닙니다")
  if (input.datasets.length === 0) return fail("datasets가 비어 있습니다")

  const ids = new Set<string>()
  for (const [i, d] of input.datasets.entries()) {
    const where = `datasets[${i}]`
    if (!isRecord(d)) return fail(`${where}가 객체가 아닙니다`)
    if (typeof d.id !== "string") return fail(`${where}.id가 없습니다`)
    if (ids.has(d.id)) return fail(`${where}.id가 중복입니다: ${d.id}`)
    ids.add(d.id)
    if (typeof d.name !== "string") return fail(`${where}.name이 없습니다`)
    if (!Array.isArray(d.columns)) return fail(`${where}.columns가 배열이 아닙니다`)
    if (!isRecord(d.data) || !Array.isArray(d.data.columns) || !Array.isArray(d.data.rows)) {
      return fail(`${where}.data가 { columns, rows } 모양이 아닙니다`)
    }
  }

  for (const [i, c] of input.charts.entries()) {
    const where = `charts[${i}]`
    if (!isRecord(c)) return fail(`${where}가 객체가 아닙니다`)
    if (typeof c.id !== "string") return fail(`${where}.id가 없습니다`)
    if (typeof c.title !== "string") return fail(`${where}.title이 없습니다`)
    if (typeof c.datasetId !== "string" || !ids.has(c.datasetId)) {
      // 이건 렌더러가 못 잡는다 — 그릴 데이터 자체가 없다.
      return fail(`${where}.datasetId가 datasets에 없습니다: ${describe(c.datasetId)}`)
    }
    if (!isRecord(c.spec)) return fail(`${where}.spec이 객체가 아닙니다`)
    // `in`은 프로토타입까지 훑어서 "toString"도 통과시킨다. hasOwn을 쓸 것.
    if (typeof c.spec.chartType !== "string" || !Object.hasOwn(MAPPING_SLOTS, c.spec.chartType)) {
      return fail(`${where}.spec.chartType이 아는 종류가 아닙니다: ${describe(c.spec.chartType)}`)
    }
    if (!isLayout(c.layout)) return fail(`${where}.layout이 { x, y, w, h } 숫자가 아닙니다`)
  }

  return { ok: true, dashboard: input as unknown as Dashboard }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isLayout(v: unknown): boolean {
  return (
    isRecord(v) &&
    ["x", "y", "w", "h"].every((k) => typeof v[k] === "number" && Number.isFinite(v[k]))
  )
}

/** 실패 문구에 값을 넣을 때. 사용자가 무엇을 고쳐야 하는지 보이게 한다. */
function describe(v: unknown): string {
  if (v === undefined) return "없음"
  if (typeof v === "string") return `"${v}"`
  return String(v)
}

function fail(reason: string): ParseResult {
  return { ok: false, reason }
}
