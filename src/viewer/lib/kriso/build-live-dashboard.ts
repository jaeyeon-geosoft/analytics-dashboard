import axios from "axios"

import {
  DASHBOARD_FORMAT,
  type Dashboard,
  type DashboardChart,
  type DashboardDataset,
  type ParseResult,
} from "@/shared/lib/dashboard"
import { KRISO_BASE_URL, KRISO_TABLES } from "@/viewer/lib/kriso/tables"
import { parseTable } from "@/viewer/lib/kriso/parse-table"
import { toDatasetAndChart } from "@/viewer/lib/kriso/to-dataset-and-chart"

const DASHBOARD_TITLE = "KRISO 실시간 대시보드"

/** ngrok 무료 티어는 이 헤더가 없으면 브라우저발 요청(XHR/fetch)에 JSON 대신
 * 503을 준다 — curl은 안 걸린다(→ docs/lessons.md#kriso-라이브-api-연동). */
const NGROK_HEADERS = { "ngrok-skip-browser-warning": "1" }

/**
 * `loadDashboardFile`(`viewer/lib/load-dashboard.ts`)과 같은 자리 — 데이터 출처만
 * 파일이 아니라 API인 뷰어 전용 경로다. 9개 테이블을 병렬로 받아 `Dashboard`로
 * 조립한다.
 *
 * **하나라도 어긋나면 전체를 실패로 본다.** 9장 중 8장만 그리는 상태는 만들지
 * 않는다 — 어느 카드가 왜 빠졌는지 알리는 새 UI를 만드는 대신, 기존 `problem`
 * 자리에 무엇이 잘못됐는지 그대로 보여준다(절대 원칙 3).
 */
export async function buildLiveDashboard(): Promise<ParseResult> {
  let responses: unknown[]
  try {
    responses = await Promise.all(
      KRISO_TABLES.map(async (table) => {
        try {
          const response = await axios.get(`${KRISO_BASE_URL}/${table.name}`, {
            headers: NGROK_HEADERS,
          })
          return response.data
        } catch (error) {
          throw new Error(
            `${table.name}: ${error instanceof Error ? error.message : "요청에 실패했습니다."}`,
            { cause: error }
          )
        }
      })
    )
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "요청에 실패했습니다." }
  }

  const datasets: DashboardDataset[] = []
  const charts: DashboardChart[] = []

  for (const [index, table] of KRISO_TABLES.entries()) {
    const parsed = parseTable(table.name, responses[index])
    if (!parsed.ok) return { ok: false, reason: parsed.reason }

    const { dataset, chart } = toDatasetAndChart(table.name, table.chartType, parsed.table, index)
    datasets.push(dataset)
    charts.push(chart)
  }

  const dashboard: Dashboard = {
    format: DASHBOARD_FORMAT,
    id: "kriso-live",
    title: DASHBOARD_TITLE,
    datasets,
    charts,
  }

  return { ok: true, dashboard }
}
