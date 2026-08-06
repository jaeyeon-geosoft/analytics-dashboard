import { AlertTriangle, Download, Plus } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { datasetCaveats } from "@/admin/components/chart-canvas/dataset-caveats"
import { datasetLabel, type AdminDataset } from "@/admin/lib/canvas-state"
import { MAX_CHARTS } from "@/shared/lib/chart-spec"

/** 파일 단위 정보와 경고. 카드마다 반복하면 같은 문장을 네 번 읽게 된다. */
export function DatasetBar({
  datasets,
  count,
  reading,
  onAddChart,
  onExport,
}: {
  datasets: AdminDataset[]
  count: number
  /** 읽는 중인 파일 이름. 카드는 그대로 두고 여기서만 알린다. */
  reading: string | null
  onAddChart: () => void
  onExport: () => void
}) {
  const single = datasets.length === 1
  const caveats = datasetCaveats(datasets)
  // 같은 파일의 다른 시트끼리는 이름이 같다. 시트까지 적어야 둘로 보인다.
  const names = datasets.map(datasetLabel).join(" · ")

  const full = count >= MAX_CHARTS
  const rows = datasets.reduce((total, dataset) => total + dataset.data.rows.length, 0)

  return (
    <div className="flex shrink-0 items-start gap-4 rounded-2xl border border-border bg-card px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm" title={names}>
          {single ? datasetLabel(datasets[0]) : `파일 ${datasets.length}개`}
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {single
            ? `${rows.toLocaleString()}행 · ${datasets[0].data.columns.length}개 컬럼`
            : `${rows.toLocaleString()}행 · ${names}`}
        </p>
        {reading && (
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {reading} 읽는 중…
          </p>
        )}
        {caveats.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>{caveats.join(" ")}</span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {full && (
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            최대 {MAX_CHARTS}개
          </span>
        )}
        {/* 카드를 늘리는 것이 이 버튼의 일이다. 새 카드가 보고 있던 차트를 물려받는 것은
            시작점일 뿐이라 이름에 넣지 않는다. */}
        <Button variant="outline" size="sm" onClick={onAddChart} disabled={full}>
          <Plus />
          차트 추가
        </Button>
        {/* API가 붙기 전까지의 임시 통로. 지금 캔버스에 있는 것을 뷰어가 읽는 JSON으로
            떨군다 — 나중에 이 버튼이 "저장"(POST)이 된다. */}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download />
          내보내기
        </Button>
      </div>
    </div>
  )
}
