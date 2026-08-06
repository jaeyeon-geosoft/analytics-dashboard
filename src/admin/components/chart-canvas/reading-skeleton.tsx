import { Skeleton } from "@/shared/components/ui/skeleton"

/**
 * 읽는 동안 자리를 지키는 막대들. 높이가 제각각인 것은 **차트가 올 자리**라는 것을
 * 말하기 위해서다 — 고른 높이면 표나 목록으로 읽힌다.
 */
const BAR_HEIGHTS = [68, 42, 88, 55, 74, 36, 61]

export function ReadingSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 items-center">
      <div className="flex h-44 w-full items-end gap-3 border-b border-l border-border">
        {BAR_HEIGHTS.map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-none rounded-t-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  )
}
