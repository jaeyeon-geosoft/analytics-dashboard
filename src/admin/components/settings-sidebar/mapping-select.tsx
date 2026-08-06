import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { ROW } from "@/admin/components/settings-sidebar/constants"
import { emptyReason } from "@/admin/components/settings-sidebar/empty-reason"
import {
  NONE_VALUE,
  fromSelectValue,
  toSelectValue,
} from "@/admin/components/settings-sidebar/select-value"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { candidatesFor, type MappingSlot } from "@/shared/lib/mapping-slots"

/** 슬롯 하나에 컬럼을 붙이는 줄. 후보는 슬롯이 받는 타입에서 나온다. */
export function MappingSelect({
  slot,
  columns,
  value,
  locked,
  onValueChange,
}: {
  slot: MappingSlot
  columns: ColumnInfo[]
  value?: string
  /**
   * 다른 슬롯 때문에 지금 못 쓰는 이유. 있으면 그 문구를 트리거에 띄우고 잠근다 —
   * 고른 값은 지우지 않고 들고 있다가 잠금이 풀리면 되살아난다.
   */
  locked?: string | null
  onValueChange: (column?: string) => void
}) {
  const id = `mapping-${slot.key}`
  const candidates = candidatesFor(slot, columns)
  const disabled = candidates.length === 0 || Boolean(locked)

  return (
    <div className={ROW}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {slot.label}
      </Label>
      <Select
        // 선택 슬롯은 비었을 때도 "없음"이 실제로 선택된 상태로 둔다.
        // 잠겼을 때만은 값을 비워 이유가 보이게 한다 — 값이 들어 있으면 그게 그려지는
        // 줄 알게 된다.
        value={
          locked ? undefined : value ? toSelectValue(value) : slot.optional ? NONE_VALUE : undefined
        }
        onValueChange={(next) => onValueChange(fromSelectValue(next))}
        disabled={disabled}
      >
        <SelectTrigger id={id} size="sm" className="w-full min-w-0 font-mono text-xs">
          <SelectValue
            placeholder={
              locked
                ? locked
                : disabled
                  ? emptyReason(slot, columns.length > 0)
                  : slot.optional
                    ? "없음"
                    : "컬럼 선택"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {slot.optional && (
            <>
              <SelectItem value={NONE_VALUE} className="text-xs">
                없음
              </SelectItem>
              <SelectSeparator />
            </>
          )}
          {candidates.map((column) => (
            <SelectItem
              key={column.name}
              value={toSelectValue(column.name)}
              className="font-mono text-xs"
            >
              {column.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
