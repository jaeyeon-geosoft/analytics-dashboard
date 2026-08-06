import { RotateCcw } from "lucide-react"

import { Button } from "@/shared/components/ui/button"

/**
 * 잠금이 풀린 동안만 나오는 줄. 옮긴 배치가 남지 않는다는 것을 여기서 밝힌다 —
 * 말하지 않으면 저장된 줄 알고 새로고침에서 잃는다(절대 원칙 4).
 */
export function UnlockedNotice({ moved, onReset }: { moved: boolean; onReset: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/40 px-4 py-2">
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        카드를 끌어 옮기고 오른쪽 아래 모서리로 크기를 바꿉니다. 옮긴 배치는 저장되지 않고,
        새로고침하면 원래대로 돌아옵니다.
      </p>
      {moved && (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={onReset}>
          <RotateCcw />
          원래 배치로
        </Button>
      )}
    </div>
  )
}
