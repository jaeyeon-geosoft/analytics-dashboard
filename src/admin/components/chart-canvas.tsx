import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Download, Plus } from "lucide-react"
import { type Layout } from "react-grid-layout"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { FileDropzone } from "@/admin/components/file-dropzone"
import { ChartCard } from "@/shared/components/chart-card"
import { ChartGrid } from "@/shared/components/chart-grid"
import {
  datasetLabel,
  type AdminChart,
  type AdminDataset,
  type OpenState,
} from "@/admin/lib/canvas-state"
import { MAX_CHARTS } from "@/shared/lib/chart-spec"
import { soloHeight, syncLayout } from "@/admin/lib/chart-layout"
import { MAX_ROWS } from "@/admin/lib/parse-file"

function CanvasFrame({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-[26rem] flex-col rounded-2xl border border-border bg-card lg:min-h-0">
      {title && (
        <header className="shrink-0 border-b border-border px-5 py-3.5">{title}</header>
      )}
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </section>
  )
}

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
  /*
    카드가 한 장일 때 세로도 채우려면 캔버스가 얼마나 높은지 알아야 한다.

    **재는 것은 스크롤 뷰포트다**(카드가 아니라). 뷰포트 높이는 내용과 무관하게 화면에서
    정해지므로 카드 높이가 뷰포트를 다시 바꾸는 되먹임이 없다 — 폭을 재는 상자를 스크롤
    안쪽에 두지 않는 것과 같은 이유다(CLAUDE.md).
  */
  const viewport = useRef<HTMLDivElement>(null)
  const [canvasHeight, setCanvasHeight] = useState(0)
  const empty = datasets.length === 0

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setCanvasHeight(entry.contentRect.height))
    observer.observe(element)
    return () => observer.disconnect()
    // 빈 상태에서는 이 상자가 아예 없다. 파일이 열려 상자가 생긴 뒤에 다시 건다.
  }, [empty])

  // 열린 파일이 아직 없다 — 화면 전체가 파일을 여는 자리다.
  if (empty) {
    if (open.status === "loading") {
      return (
        <CanvasFrame
          title={
            <>
              <p className="font-mono text-sm">{open.fileName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">읽는 중…</p>
            </>
          }
        >
          <div className="flex min-h-0 flex-1 items-center">
            <div className="flex h-44 w-full items-end gap-3 border-b border-l border-border">
              {[68, 42, 88, 55, 74, 36, 61].map((height, index) => (
                <Skeleton
                  key={index}
                  className="flex-1 rounded-none rounded-t-sm"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </CanvasFrame>
      )
    }

    return (
      <CanvasFrame>
        {open.status === "error" && (
          <Alert variant="destructive" className="mb-5">
            <AlertTriangle />
            <AlertTitle>파일을 열지 못했습니다</AlertTitle>
            <AlertDescription>
              {open.fileName && <span className="font-mono">{open.fileName}</span>}
              {open.fileName && " — "}
              {open.message}
            </AlertDescription>
          </Alert>
        )}
        <FileDropzone
          onFile={onFile}
          className={open.status === "error" ? "flex-1 justify-center" : "h-full flex-1 justify-center border-0"}
        />
      </CanvasFrame>
    )
  }

  const single = charts.length === 1

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/*
        파일이 열려 있는데 읽기가 실패했다면 열린 것을 치우지 않는다 — 시트를 잘못
        고른 것뿐일 수 있고, 그 사실만 위에 얹으면 된다.
      */}
      {open.status === "error" && (
        <Alert variant="destructive" className="shrink-0">
          <AlertTriangle />
          <AlertTitle>파일을 열지 못했습니다</AlertTitle>
          <AlertDescription>
            {open.fileName && <span className="font-mono">{open.fileName}</span>}
            {open.fileName && " — "}
            {open.message}
          </AlertDescription>
        </Alert>
      )}
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
        {canvasHeight > 0 && (
        <CanvasGrid
          charts={charts}
          datasets={datasets}
          layout={layout}
          onLayoutChange={onLayoutChange}
          activeId={activeId}
          single={single}
          soloH={soloHeight(canvasHeight)}
          onSelectChart={onSelectChart}
          onRemoveChart={onRemoveChart}
        />
        )}
      </div>
    </div>
  )
}

/**
 * 캔버스에 놓이는 카드들. 격자 자체는 shared의 `ChartGrid`가 맡고(뷰어와 같은 것),
 * 여기서는 카드와 배치를 맞춰 넘기는 일만 한다.
 */
function CanvasGrid({
  charts,
  datasets,
  layout,
  onLayoutChange,
  activeId,
  single,
  soloH,
  onSelectChart,
  onRemoveChart,
}: {
  charts: AdminChart[]
  datasets: AdminDataset[]
  layout: Layout
  onLayoutChange: (next: Layout) => void
  activeId: string
  single: boolean
  /** 카드가 한 장일 때 쓸 높이(칸). 캔버스를 재서 나온 값이다. */
  soloH: number
  onSelectChart: (id: string) => void
  onRemoveChart: (id: string) => void
}) {
  const byId = new Map(datasets.map((dataset) => [dataset.id, dataset]))
  // 파일을 지우면 그 파일을 보던 카드도 함께 지워지므로 짝은 항상 있다. 타입을 좁히려고
  // 한 번 거르고, 거른 결과로 배치를 맞춘다 — 둘이 어긋나면 rgl이 빈 자리를 남긴다.
  const cards = charts.flatMap((chart) => {
    const dataset = byId.get(chart.datasetId)
    return dataset ? [{ chart, dataset }] : []
  })
  // 카드가 늘거나 줄면 배치가 어긋난다. 넘기기 직전에 한 번 맞춘다.
  const settled = syncLayout(cards.map(({ chart }) => chart.spec.id), layout, soloH)

  return (
    <ChartGrid layout={settled} onLayoutChange={onLayoutChange}>
      {cards.map(({ chart, dataset }, index) => (
        // `grid`라 안의 카드가 rgl이 정해준 칸을 그대로 채운다.
        <div key={chart.spec.id} className="grid">
          <ChartCard
            spec={chart.spec}
            number={index + 1}
            order={index}
            data={dataset.data}
            columns={dataset.columns}
            selected={chart.spec.id === activeId}
            onSelect={() => onSelectChart(chart.spec.id)}
            onRemove={single ? undefined : () => onRemoveChart(chart.spec.id)}
          />
        </div>
      ))}
    </ChartGrid>
  )
}

/** 파일 단위 정보와 경고. 카드마다 반복하면 같은 문장을 네 번 읽게 된다. */
function DatasetBar({
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
  // 파일이 여럿이면 어느 파일의 경고인지 밝혀야 한다. 하나면 이름이 이미 위에 있다.
  const caveats = datasets.flatMap((dataset) =>
    [
      dataset.data.truncated && `상한 ${MAX_ROWS.toLocaleString()}행까지만 읽었습니다.`,
      dataset.data.errorCount > 0 &&
        `${dataset.data.errorCount.toLocaleString()}개 행이 헤더와 모양이 달랐습니다.`,
    ]
      .filter((note): note is string => typeof note === "string")
      .map((note) => (single ? note : `${datasetLabel(dataset)}: ${note}`))
  )
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
