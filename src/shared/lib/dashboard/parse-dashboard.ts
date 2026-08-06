// 아는 차트 종류의 목록으로 쓴다. `Record<ChartType, …>`라 종류가 늘면
// 타입 검사가 여기 채우기를 강제한다 — 따로 배열을 두면 조용히 어긋난다.
import { MAPPING_SLOTS } from "@/shared/lib/mapping-slots"
import { DASHBOARD_FORMAT } from "@/shared/lib/dashboard/constants"
import { describe, fail, isLayout, isRecord } from "@/shared/lib/dashboard/guards"
import type { Dashboard, ParseResult } from "@/shared/lib/dashboard/types"

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
    return fail(
      `형식 버전이 ${DASHBOARD_FORMAT}이어야 합니다 (받은 값: ${describe(input.format)})`
    )
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
