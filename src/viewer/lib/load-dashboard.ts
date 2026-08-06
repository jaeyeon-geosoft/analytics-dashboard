import { parseDashboard, type ParseResult } from "@/shared/lib/dashboard"

/**
 * 대시보드를 가져오는 **유일한 자리**.
 *
 * 지금은 어드민이 내보낸 JSON 파일을 읽지만, API가 붙으면 이 함수 안이
 * `fetch("/api/dashboards/" + id)`로 바뀐다. 바깥에서 보이는 모양은 그대로다 —
 * 뷰어의 다른 코드는 어디서 왔는지 몰라야 갈아끼우기가 한 곳으로 끝난다.
 */
export async function loadDashboardFile(file: File): Promise<ParseResult> {
  let raw: string
  try {
    raw = await file.text()
  } catch {
    return { ok: false, reason: "파일을 읽지 못했습니다." }
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (error) {
    // JSON이 아닌 것을 열었을 때가 가장 흔하다. 무엇이 잘못됐는지 그대로 보여준다.
    return {
      ok: false,
      reason: `JSON으로 읽지 못했습니다 — ${error instanceof Error ? error.message : "형식 오류"}`,
    }
  }

  return parseDashboard(json)
}
