import { ROW } from "@/admin/components/settings-sidebar/constants"
import { emptyReason } from "@/admin/components/settings-sidebar/empty-reason"
import { stackNote } from "@/admin/components/settings-sidebar/stack-note"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import { candidatesFor, type MappingSlot } from "@/shared/lib/mapping-slots"
import { cn } from "@/shared/lib/utils"

/**
 * 숫자 컬럼이 스무 개인 파일도 있다. 목록을 다 펼치면 사이드바가 이 슬롯 하나로
 * 채워지므로 여기서 끊고 스크롤로 넘긴다. 플롯이 아니라 사이드바라 폭이 진동해도
 * 다시 재는 것이 없다.
 */
const LIST_MAX_HEIGHT = "max-h-40"

/**
 * 컬럼을 여럿 고르는 줄. **고른 컬럼 하나하나가 차트의 층이 된다.**
 *
 * 드롭다운이 아니라 펼친 목록인 것은, 여기서 고르는 것이 "하나"가 아니라 "어느
 * 것들"이라서다 — 닫힌 트리거에 컬럼 이름 셋을 이어 붙이면 좁은 사이드바에서 앞부분만
 * 남고 잘린다. 후보가 몇 개뿐이라(값 슬롯은 숫자 컬럼만 받는다) 펼쳐도 짧다.
 */
export function MappingMultiSelect({
  slot,
  columns,
  value,
  max,
  onValueChange,
}: {
  slot: MappingSlot
  columns: ColumnInfo[]
  value: string[]
  /** 고를 수 있는 개수. 다 차면 나머지 후보가 잠긴다 — 이유는 목록 아래에 적는다. */
  max: number
  onValueChange: (columns: string[]) => void
}) {
  const labelId = `mapping-${slot.key}`
  const candidates = candidatesFor(slot, columns)
  const chosen = new Set(value)
  const full = value.length >= max

  /*
    쌓이는 순서는 **파일의 컬럼 순서**다(목록에 보이는 순서 그대로).

    누른 순서로 두면 같은 파일에서 같은 컬럼을 골라도 체크한 차례에 따라 층이 뒤집혀,
    나란히 선 두 카드가 다르게 보인다. 그래서 토글할 때마다 후보 순서로 다시 세운다.
  */
  const toggle = (name: string) =>
    onValueChange(
      candidates
        .map((column) => column.name)
        .filter((column) => (column === name ? !chosen.has(column) : chosen.has(column)))
    )

  const note = stackNote(value.length, max)

  return (
    // 목록은 한 줄보다 높다. 라벨을 가운데 두면 목록 한복판에 떠 있게 되므로 위로 맞춘다.
    <div className={cn(ROW, "items-start")}>
      <span id={labelId} className="mt-1.5 text-xs text-muted-foreground">
        {slot.label}
      </span>
      <div className="min-w-0">
        {candidates.length === 0 ? (
          <p className="py-1.5 text-xs text-muted-foreground">
            {emptyReason(slot, columns.length > 0)}
          </p>
        ) : (
          <div
            role="group"
            aria-labelledby={labelId}
            className={cn(
              "overflow-y-auto rounded-md border border-input p-1",
              LIST_MAX_HEIGHT
            )}
          >
            {candidates.map((column) => {
              const checked = chosen.has(column.name)
              // 다 찼으면 고르지 **않은** 것만 잠근다. 고른 것을 잠그면 되돌릴 수가 없다.
              const disabled = !checked && full
              return (
                <label
                  key={column.name}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded px-1.5 py-1",
                    disabled ? "opacity-40" : "cursor-pointer hover:bg-accent"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(column.name)}
                    className="size-3 shrink-0 accent-primary"
                  />
                  {/* 긴 컬럼 이름이 사이드바를 밀어내지 않게. 조상마다 `min-w-0`이 있어야 먹는다. */}
                  <span className="truncate font-mono text-xs">{column.name}</span>
                </label>
              )
            })}
          </div>
        )}
        {note && <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}
