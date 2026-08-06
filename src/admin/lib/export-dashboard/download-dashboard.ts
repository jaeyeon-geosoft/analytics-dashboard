import { baseName } from "@/admin/lib/export-dashboard/titles"
import type { Dashboard } from "@/shared/lib/dashboard"

const FILE_SUFFIX = ".dashboard.json"
const MIME = "application/json"

/** 브라우저에 파일로 떨궈준다. API가 붙으면 이 자리가 POST가 된다. */
export function downloadDashboard(dashboard: Dashboard): void {
  // 보기 좋으라고 들여쓰지 않는다. 이건 곧 API 본문이 될 것이고,
  // 실제로 얼마나 큰지가 눈에 보여야 한다.
  const blob = new Blob([JSON.stringify(dashboard)], { type: MIME })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${baseName(dashboard.title)}${FILE_SUFFIX}`
  link.click()
  URL.revokeObjectURL(url)
}
