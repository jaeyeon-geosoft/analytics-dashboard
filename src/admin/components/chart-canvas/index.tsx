import { type Layout } from "react-grid-layout"

import { CanvasGrid } from "@/admin/components/chart-canvas/canvas-grid"
import { DatasetBar } from "@/admin/components/chart-canvas/dataset-bar"
import { EmptyCanvas } from "@/admin/components/chart-canvas/empty-canvas"
import { FileErrorAlert } from "@/admin/components/chart-canvas/file-error-alert"
import { useCanvasHeight } from "@/admin/components/chart-canvas/use-canvas-height"
import { soloHeight } from "@/admin/lib/chart-layout"
import type { AdminChart, AdminDataset, OpenState } from "@/admin/lib/canvas-state"

export function ChartCanvas({
  datasets,
  open,
  charts,
  activeId,
  onSelectChart,
  onAddChart,
  onRemoveChart,
  onExport,
  onFile,
  layout,
  onLayoutChange,
}: {
  datasets: AdminDataset[]
  open: OpenState
  charts: AdminChart[]
  activeId: string
  onSelectChart: (id: string) => void
  onAddChart: () => void
  onExport: () => void
  layout: Layout
  onLayoutChange: (next: Layout) => void
  onRemoveChart: (id: string) => void
  onFile: (file: File) => void
}) {
  const empty = datasets.length === 0
  const { viewport, height } = useCanvasHeight(empty)

  if (empty) return <EmptyCanvas open={open} onFile={onFile} />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/*
        파일이 열려 있는데 읽기가 실패했다면 열린 것을 치우지 않는다 — 시트를 잘못
        고른 것뿐일 수 있고, 그 사실만 위에 얹으면 된다.
      */}
      <FileErrorAlert open={open} className="shrink-0" />
      <DatasetBar
        datasets={datasets}
        count={charts.length}
        reading={open.status === "loading" ? open.fileName : null}
        onAddChart={onAddChart}
        onExport={onExport}
      />
      {/*
        스크롤은 이 바깥 상자가 맡고, 폭을 재는 상자는 그 안이다. 스크롤바 자리를
        미리 비워둬야(`scrollbar-gutter`) 스크롤바가 생겼다 사라질 때 폭이 15px
        진동하지 않는다 — 진동하면 재측정이 되먹임에 빠진다(CLAUDE.md).
      */}
      <div ref={viewport} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {/*
          **재기 전에는 격자를 그리지 않는다.** 한 장짜리 카드의 높이가 이 측정에서
          나오는데, 먼저 그려버리면 대비값으로 자리가 잡히고 그 자리가 곧바로 저장돼
          (rgl → `onLayoutChange`) 나중에 온 측정값이 밀려난다 — 실제로 508px에서
          안 움직였다. 폭을 재는 쪽(`ChartGrid`)도 같은 이유로 한 프레임 기다린다.
        */}
        {height > 0 && (
          <CanvasGrid
            charts={charts}
            datasets={datasets}
            layout={layout}
            onLayoutChange={onLayoutChange}
            activeId={activeId}
            single={charts.length === 1}
            soloH={soloHeight(height)}
            onSelectChart={onSelectChart}
            onRemoveChart={onRemoveChart}
          />
        )}
      </div>
    </div>
  )
}
