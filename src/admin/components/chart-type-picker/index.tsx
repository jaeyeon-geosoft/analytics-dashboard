import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { CHART_TYPES } from "@/admin/components/chart-type-picker/chart-type-options"
import type { ChartType } from "@/shared/lib/chart-types"

export function ChartTypePicker({
  value,
  onValueChange,
  disabled,
}: {
  value: ChartType
  onValueChange: (value: ChartType) => void
  disabled?: boolean
}) {
  const selected = CHART_TYPES.find((type) => type.value === value)

  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        disabled={disabled}
        onValueChange={(next) => next && onValueChange(next as ChartType)}
        // 8종을 3열로 두면 3줄(약 190px)이라 사이드바 세로의 1/3을 먹었다. 정작 자주
        // 만지는 매핑이 스크롤 밖으로 밀린다. 4열 2줄로 줄인다.
        className="grid w-full grid-cols-4 gap-1"
      >
        {CHART_TYPES.map((type) => (
          <ToggleGroupItem
            key={type.value}
            value={type.value}
            aria-label={type.label}
            className="h-auto flex-col gap-1 rounded-lg px-0.5 py-2 data-[state=on]:border-chart-1/40 data-[state=on]:bg-chart-1/10 data-[state=on]:text-chart-1"
          >
            <svg viewBox="0 0 20 18" className="h-4 w-[18px]" fill="currentColor" aria-hidden>
              {type.glyph}
            </svg>
            <span className="text-[10px] leading-none font-medium text-foreground/70">
              {type.label}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {selected && <p className="mt-2 text-[11px] text-muted-foreground">{selected.hint}</p>}
    </>
  )
}
