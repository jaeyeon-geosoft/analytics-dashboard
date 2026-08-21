import { Radio } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Spinner } from "@/shared/components/ui/spinner"

/** KRISO API에서 9개 테이블을 받아 그린다. 같은 버튼이 헤더와 빈 화면 두 곳에 선다. */
export function LiveDashboardButton({
  onClick,
  loading,
  label,
  className,
}: {
  onClick: () => void
  loading: boolean
  label: string
  className?: string
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading} className={className}>
      {loading ? <Spinner /> : <Radio />}
      {label}
    </Button>
  )
}
