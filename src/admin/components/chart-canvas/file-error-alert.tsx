import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import type { OpenState } from "@/admin/lib/canvas-state"

/**
 * 파일을 열지 못했다는 알림.
 *
 * 빈 캔버스와 파일이 열려 있는 캔버스 **두 곳**에 같은 모양으로 선다. 문구를 두 벌
 * 들고 있으면 한쪽만 고쳐질 자리다.
 */
export function FileErrorAlert({
  open,
  className,
}: {
  open: OpenState
  className?: string
}) {
  if (open.status !== "error") return null

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle />
      <AlertTitle>파일을 열지 못했습니다</AlertTitle>
      <AlertDescription>
        {open.fileName && <span className="font-mono">{open.fileName}</span>}
        {open.fileName && " — "}
        {open.message}
      </AlertDescription>
    </Alert>
  )
}
