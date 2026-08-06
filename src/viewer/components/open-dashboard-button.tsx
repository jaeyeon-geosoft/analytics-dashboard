import { FolderOpen } from "lucide-react"

import { FilePickerButton } from "@/shared/components/file-picker-button"

/** 뷰어가 여는 것은 어드민이 내보낸 대시보드 JSON뿐이다. */
const DASHBOARD_ACCEPT = "application/json,.json"

/** 같은 버튼이 헤더와 빈 화면 두 곳에 선다. */
export function OpenDashboardButton({
  onFile,
  label,
  className,
}: {
  onFile: (file: File) => void
  label: string
  className?: string
}) {
  return (
    <FilePickerButton accept={DASHBOARD_ACCEPT} onFile={onFile} className={className}>
      <FolderOpen />
      {label}
    </FilePickerButton>
  )
}
