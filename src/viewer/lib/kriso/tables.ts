import type { ChartType } from "@/shared/lib/chart-types"

/**
 * 라이브로 보여줄 9개 테이블과 각각의 차트 종류. **차트 종류는 데이터로 추론하지
 * 않는다** — 분석가(사용자)가 테이블마다 직접 정했다. 여기 없는 테이블은 그리지 않는다.
 */
export const KRISO_TABLES: { name: string; chartType: Extract<ChartType, "line" | "bar" | "stacked"> }[] = [
  { name: "VIEW_AIS_VDM_CHART_01", chartType: "line" },
  { name: "VIEW_AIS_VDM_CHART_02", chartType: "bar" },
  { name: "VIEW_AIS_VDO_CHART_01", chartType: "bar" },
  { name: "VIEW_AIS_VDO_CHART_02", chartType: "bar" },
  { name: "VIEW_ANEMOMETER_MTW_CHART_01", chartType: "line" },
  { name: "VIEW_ANEMOMETER_MTW_CHART_02", chartType: "bar" },
  { name: "VIEW_ANEMOMETER_MWV_CHART_01", chartType: "line" },
  { name: "VIEW_ANEMOMETER_MWV_CHART_02", chartType: "line" },
  { name: "VIEW_AUTOPILOTCONTACT_AUTOPILOTCONTACT_CHART_01", chartType: "stacked" },
]

export const KRISO_BASE_URL = "https://series-serotonin-chess.ngrok-free.dev/KRISO"
