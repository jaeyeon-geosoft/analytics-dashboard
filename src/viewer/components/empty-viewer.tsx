import { AlertTriangle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { OpenDashboardButton } from "@/viewer/components/open-dashboard-button"

/** 아직 아무것도 안 열었을 때. 무엇이 잘못됐는지는 여기서 말한다(절대 원칙 3). */
export function EmptyViewer({
  problem,
  onFile,
}: {
  problem: string | null
  onFile: (file: File) => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        {problem && (
          <Alert variant="destructive" className="mb-5">
            <AlertTriangle />
            <AlertTitle>대시보드를 열지 못했습니다</AlertTitle>
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm">어드민에서 내보낸 대시보드를 여세요.</p>
          <p className="mt-1 text-xs text-muted-foreground">API가 붙기 전까지의 임시 통로입니다.</p>
          <OpenDashboardButton onFile={onFile} label="대시보드 열기" className="mt-5" />
        </div>
      </div>
    </div>
  )
}
