import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { AppHeader } from "@/admin/components/app-header"
import { ChartCanvas } from "@/admin/components/chart-canvas"
import { SettingsSidebar } from "@/admin/components/settings-sidebar"
import { useAdminWorkspace } from "@/admin/hooks/use-admin-workspace"
import { TOOLTIP_DELAY } from "@/shared/lib/tooltip-delay"

function App() {
  const workspace = useAdminWorkspace()

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <AppHeader onFile={workspace.openFile} />
        {/*
          세로로 쌓일 때는 캔버스가 먼저다. 설정이 위에 있으면 스크롤을 한참 내려야
          차트가 나온다 — 파일을 열기 전에는 드롭존이 먼저 보여서 그것도 맞다.
        */}
        <div className="flex flex-1 flex-col-reverse lg:min-h-0 lg:flex-row">
          <SettingsSidebar
            datasets={workspace.datasets}
            charts={workspace.charts}
            chart={workspace.active}
            chartNumber={workspace.activeNumber}
            onColumnTypeChange={workspace.changeColumnType}
            onChartChange={workspace.changeChart}
            onChartFile={workspace.changeChartFile}
            onChartSheet={workspace.changeChartSheet}
            onDeriveGap={workspace.deriveGap}
            onHeaderRowChange={workspace.changeHeaderRow}
            onCloseDataset={workspace.closeDataset}
            onFile={workspace.openFile}
          />
          <main className="flex min-w-0 flex-1 flex-col p-4 lg:min-h-0">
            <ChartCanvas
              datasets={workspace.datasets}
              open={workspace.open}
              charts={workspace.charts}
              activeId={workspace.active?.spec.id ?? ""}
              onSelectChart={workspace.selectChart}
              onAddChart={workspace.addChart}
              onExport={workspace.exportDashboard}
              layout={workspace.layout}
              onLayoutChange={workspace.setLayout}
              onRemoveChart={workspace.removeChart}
              onFile={workspace.openFile}
            />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
