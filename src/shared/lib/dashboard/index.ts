/**
 * 어드민이 만들고 뷰어가 그리는 것의 모양이 있는 **한 곳**. 백엔드와의 합의라
 * 함부로 늘리지 말 것.
 */
export {
  DASHBOARD_FORMAT,
  GRID_COLS,
  GRID_MARGIN,
  GRID_MIN_H,
  GRID_MIN_W,
  GRID_ROW_HEIGHT,
} from "@/shared/lib/dashboard/constants"
export { parseDashboard } from "@/shared/lib/dashboard/parse-dashboard"
export type {
  Dashboard,
  DashboardChart,
  DashboardDataset,
  DashboardLayout,
  ParseResult,
} from "@/shared/lib/dashboard/types"
