import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { TOOLTIP_DELAY } from "@/shared/lib/tooltip-delay"
import { DashboardGrid } from "@/viewer/components/dashboard-grid"
import { EmptyViewer } from "@/viewer/components/empty-viewer"
import { UnlockedNotice } from "@/viewer/components/unlocked-notice"
import { ViewerHeader } from "@/viewer/components/viewer-header"
import { useDashboardView } from "@/viewer/hooks/use-dashboard-view"

export default function ViewerApp() {
  const view = useDashboardView()

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY}>
      <div className="flex h-dvh flex-col">
        <ViewerHeader
          dashboard={view.dashboard}
          locked={view.locked}
          onToggleLock={view.toggleLock}
          onFile={view.open}
        />

        {view.dashboard ? (
          <>
            {!view.locked && <UnlockedNotice moved={view.moved} onReset={view.resetLayout} />}
            {/* 스크롤은 여기가 맡는다. 스크롤바 자리를 미리 비워둬야 폭이 진동하지 않는다 —
                폭이 흔들리면 Recharts의 ResponsiveContainer가 재측정에 빠진다(CLAUDE.md). */}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              <DashboardGrid
                dashboard={view.dashboard}
                layout={view.layout}
                onLayoutChange={view.setLayout}
                locked={view.locked}
              />
            </div>
          </>
        ) : (
          <EmptyViewer problem={view.problem} onFile={view.open} />
        )}
      </div>
    </TooltipProvider>
  )
}
