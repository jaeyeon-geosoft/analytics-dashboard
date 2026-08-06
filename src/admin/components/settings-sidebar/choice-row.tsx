import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { ROW } from "@/admin/components/settings-sidebar/constants"

/** 집계·정렬·기준선처럼 선택지가 고정된 줄. 매핑과 같은 격자에 선다. */
export function ChoiceRow<T extends string>({
  id,
  label,
  value,
  labels,
  disabled,
  onValueChange,
}: {
  id: string
  label: string
  value: T
  /** 값 → 화면에 보일 이름. 키 순서가 곧 목록 순서다. */
  labels: Record<T, string>
  disabled?: boolean
  onValueChange: (value: T) => void
}) {
  return (
    <div className={ROW}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)} disabled={disabled}>
        <SelectTrigger id={id} size="sm" className="w-full min-w-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(labels) as T[]).map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
