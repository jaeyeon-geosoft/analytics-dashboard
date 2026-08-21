import { useMutation } from "@tanstack/react-query"

import type { ParseResult } from "@/shared/lib/dashboard"
import { buildLiveDashboard } from "@/viewer/lib/kriso/build-live-dashboard"

/**
 * `buildLiveDashboard`를 감싸는 얇은 tanstack query 래퍼. 마운트 시 자동으로 부르지
 * 않는다 — "라이브 데이터 보기" 버튼을 눌렀을 때만 `load()`를 호출한다.
 */
export function useLiveDashboard(): { load: () => Promise<ParseResult>; loading: boolean } {
  const mutation = useMutation({ mutationFn: buildLiveDashboard })
  return { load: mutation.mutateAsync, loading: mutation.isPending }
}
