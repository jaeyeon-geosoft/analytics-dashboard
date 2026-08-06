import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { VIEWS, VIEW_LABELS, type View } from "@/shared/components/chart-card/constants"

/** 차트 ↔ 표. 누른 쪽은 곧바로 눌린 것으로 보이고, 그리는 것만 다음 프레임으로 미룬다. */
export function ViewToggle({
  value,
  onSelect,
}: {
  value: View
  onSelect: (next: View) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(next) => next && onSelect(next as View)}
      spacing={0}
      className="shrink-0"
    >
      {VIEWS.map((view) => (
        <ToggleGroupItem key={view} value={view} size="sm" className="text-xs">
          {VIEW_LABELS[view]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
