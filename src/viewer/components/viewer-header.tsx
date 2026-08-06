import { Lock, LockOpen } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { BrandMark } from "@/shared/components/brand-mark"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { OpenDashboardButton } from "@/viewer/components/open-dashboard-button"
import type { Dashboard } from "@/shared/lib/dashboard"

export function ViewerHeader({
  dashboard,
  locked,
  onToggleLock,
  onFile,
}: {
  dashboard: Dashboard | null
  locked: boolean
  onToggleLock: () => void
  onFile: (file: File) => void
}) {
  const lockLabel = locked ? "배치 바꾸기" : "배치 잠그기"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
      {/* 어드민과 같은 마크. 두 화면이 한 제품이라는 것을 여기서 보여준다. */}
      <BrandMark />
      <div className="min-w-0 flex-1">
        {dashboard ? (
          <>
            <h1 className="truncate text-base font-bold tracking-[-0.02em]">{dashboard.title}</h1>
            {/* 어느 파일에서 나온 차트인지 밝힌다 — 대시보드 하나에 파일이 섞일 수 있다. */}
            <p className="truncate font-mono text-xs text-muted-foreground">
              차트 {dashboard.charts.length}장 ·{" "}
              {dashboard.datasets.map((dataset) => dataset.name).join(", ")}
            </p>
          </>
        ) : (
          <h1 className="text-base leading-none font-bold tracking-[-0.02em]">차트 보기</h1>
        )}
      </div>
      {dashboard && (
        <Button
          variant="outline"
          size="sm"
          aria-pressed={!locked}
          // 좁은 화면에서는 글자가 빠지고 아이콘만 남는다. 이름은 남겨야 한다.
          aria-label={lockLabel}
          onClick={onToggleLock}
        >
          {locked ? <LockOpen /> : <Lock />}
          <span className="hidden sm:inline">{lockLabel}</span>
        </Button>
      )}
      <OpenDashboardButton onFile={onFile} label={dashboard ? "다른 대시보드" : "대시보드 열기"} />
      <Separator orientation="vertical" className="h-6" />
      <ThemeToggle />
    </header>
  )
}
