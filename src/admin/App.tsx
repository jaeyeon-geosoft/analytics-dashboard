import { useState } from "react"
import type { Layout } from "react-grid-layout"

import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { AppHeader } from "@/admin/components/app-header"
import { SettingsSidebar } from "@/admin/components/settings-sidebar"
import { ChartCanvas } from "@/admin/components/chart-canvas"
import {
  createDataset,
  type AdminChart,
  type AdminDataset,
  type OpenState,
} from "@/admin/lib/canvas-state"
import {
  createChart,
  duplicateChart,
  withColumns,
  MAX_CHARTS,
  type ChartSpec,
} from "@/shared/lib/chart-spec"
import { syncLayout } from "@/admin/lib/chart-layout"
import { addGapColumn } from "@/admin/lib/derive-column"
import { buildDashboard, downloadDashboard } from "@/admin/lib/export-dashboard"
import { validateFile } from "@/admin/lib/file-constraints"
import { parseFile, type ParsedFile, type ParseOptions } from "@/admin/lib/parse-file"
import { inferColumns, type ColumnType } from "@/shared/lib/infer-types"

/** 읽기는 성공했는데 그릴 것이 없는 경우. 파싱 실패와 문구가 달라야 한다. */
function shapeProblem(data: ParsedFile): string | null {
  if (data.columns.length === 0) {
    return data.sheet
      ? `"${data.sheet}" 시트가 비어 있습니다.`
      : `${data.headerRow}행에서 컬럼을 찾지 못했습니다. 헤더가 다른 줄에 있는지 확인해 주세요.`
  }
  if (data.rows.length === 0) return "헤더만 있고 데이터 행이 없습니다."
  return null
}

function App() {
  // 열어둔 파일들. 아직 한 번에 하나만 열리지만, 계약(`Dashboard.datasets`)이 배열이라
  // 여기도 배열이다 — 카드마다 다른 파일을 붙이는 것이 이 배열 위에 올라간다.
  const [datasets, setDatasets] = useState<AdminDataset[]>([])
  // 파일을 읽는 동안만 차는 자리. 열어둔 것들과 따로 둬야 실패가 그것들을 지우지 않는다.
  const [open, setOpen] = useState<OpenState>({ status: "idle" })
  // 차트 명세는 카드마다 따로고, 어느 파일을 보는지도 카드마다 따로다.
  const [charts, setCharts] = useState<AdminChart[]>([])
  const [activeId, setActiveId] = useState("")
  // 배치는 명세와 따로 둔다. 종류·매핑은 "무엇을 그리나"고 배치는 "어디에 놓나"라
  // 서로 바뀌는 계기가 다르고, 내보내는 계약에서도 spec과 layout이 갈려 있다.
  const [layout, setLayout] = useState<Layout>([])

  // 지운 카드가 선택돼 있었으면 첫 카드로 흘러내린다 — 지울 때 따로 손대지 않아도 된다.
  const active = charts.find((chart) => chart.spec.id === activeId) ?? charts[0] ?? null
  // 사이드바가 보여줄 파일은 **지금 편집 중인 카드가 보는 파일**이다. 컬럼 타입을 고치면
  // 그 파일을 보는 카드들이 따라 바뀌므로, 어느 파일을 고치는 중인지가 화면과 맞아야 한다.
  const activeDataset = datasets.find((dataset) => dataset.id === active?.datasetId) ?? null

  /**
   * 파일을 읽어 데이터셋으로 만든다.
   *
   * `replaces`가 있으면 그 데이터셋을 **같은 자리에** 갈아끼운다(시트·헤더 행 변경).
   * 없으면 새로 연 파일이다.
   */
  async function loadFile(file: File, options: ParseOptions, replaces?: string) {
    const rejected = validateFile(file)
    if (rejected) {
      setOpen({ status: "error", fileName: file.name, message: rejected })
      return
    }

    if (!replaces) {
      // 아직 파일을 하나만 다룬다. 새 파일을 열면 앞의 것을 통째로 대신한다.
      setDatasets([])
      setCharts([])
    }
    setOpen({ status: "loading", fileName: file.name })

    try {
      const data = await parseFile(file, options)
      const problem = shapeProblem(data)
      if (problem) {
        setOpen({ status: "error", fileName: file.name, message: problem })
        return
      }

      const columns = inferColumns(data.columns, data.rows)

      if (replaces) {
        setDatasets((previous) =>
          previous.map((dataset) =>
            dataset.id === replaces ? { ...dataset, data, columns } : dataset
          )
        )
        // 컬럼이 통째로 달라졌다. **이 파일을 보는 카드만** 다시 맞춘다 — 다른 파일에
        // 붙은 카드는 아무 상관이 없다.
        setCharts((previous) =>
          previous.map((chart) =>
            chart.datasetId === replaces
              ? { ...chart, spec: withColumns(chart.spec, columns) }
              : chart
          )
        )
      } else {
        const dataset = createDataset(file, data, columns)
        // 열자마자 차트가 보여야 한다. 고르고 있던 차트 종류만 넘겨받고 필수 슬롯을 채운다.
        const spec = createChart(columns, active?.spec.chartType)
        setDatasets([dataset])
        setCharts([{ spec, datasetId: dataset.id }])
        setActiveId(spec.id)
        setLayout(syncLayout([spec.id], []))
      }
      setOpen({ status: "idle" })
    } catch (error) {
      setOpen({
        status: "error",
        fileName: file.name,
        message: error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
      })
    }
  }

  /** 시트·헤더 행을 바꾸면 같은 파일을 그 설정으로 다시 읽는다. */
  function reopen(datasetId: string, options: ParseOptions) {
    const dataset = datasets.find((entry) => entry.id === datasetId)
    if (dataset) loadFile(dataset.source, options, datasetId)
  }

  function handleColumnType(datasetId: string, name: string, type: ColumnType) {
    const dataset = datasets.find((entry) => entry.id === datasetId)
    if (!dataset) return

    const columns = dataset.columns.map((column) =>
      column.name === name ? { ...column, type } : column
    )
    setDatasets((previous) =>
      previous.map((entry) => (entry.id === datasetId ? { ...entry, columns } : entry))
    )
    // 타입이 바뀌면 그 컬럼이 더는 후보가 아닐 수 있다. 이 파일을 보는 카드를 모두
    // 정리한다 — 선택돼 있지 않은 카드도 그 컬럼을 쓰고 있을 수 있다.
    setCharts((previous) =>
      previous.map((chart) =>
        chart.datasetId === datasetId ? { ...chart, spec: withColumns(chart.spec, columns) } : chart
      )
    )
  }

  function handleChartChange(next: ChartSpec) {
    setCharts((previous) =>
      previous.map((chart) => (chart.spec.id === next.id ? { ...chart, spec: next } : chart))
    )
  }

  /** 시차 컬럼은 후보로 나타나기만 한다. 묻지도 않았는데 매핑을 바꾸지 않는다. */
  function handleDeriveGap(datasetId: string, name: string) {
    const dataset = datasets.find((entry) => entry.id === datasetId)
    if (!dataset) return
    const derived = addGapColumn(dataset.data, name)
    if (!derived) return

    setDatasets((previous) =>
      previous.map((entry) =>
        entry.id === datasetId
          ? { ...entry, data: derived.data, columns: [...entry.columns, derived.column] }
          : entry
      )
    )
  }

  /** API가 붙기 전까지의 임시 통로. 나중에 이 자리가 POST /api/charts가 된다. */
  function handleExport() {
    if (charts.length === 0) return
    downloadDashboard(buildDashboard(datasets, charts, layout))
  }

  function handleAddChart() {
    if (!active || charts.length >= MAX_CHARTS) return
    // 보고 있던 카드를 그대로 한 장 더 — 보던 파일까지 물려받는다.
    const added = { ...active, spec: duplicateChart(active.spec) }
    setCharts((previous) => [...previous, added])
    setActiveId(added.spec.id)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <AppHeader onFile={(file) => loadFile(file, {})} />
        {/*
          세로로 쌓일 때는 캔버스가 먼저다. 설정이 위에 있으면 스크롤을 한참 내려야
          차트가 나온다 — 파일을 열기 전에는 드롭존이 먼저 보여서 그것도 맞다.
        */}
        <div className="flex flex-1 flex-col-reverse lg:min-h-0 lg:flex-row">
          <SettingsSidebar
            dataset={activeDataset}
            onColumnTypeChange={handleColumnType}
            chart={active?.spec ?? null}
            chartNumber={active ? charts.indexOf(active) + 1 : 0}
            chartCount={charts.length}
            onChartChange={handleChartChange}
            onDeriveGap={handleDeriveGap}
            onSheetChange={(datasetId, sheet) => reopen(datasetId, { sheet })}
            onHeaderRowChange={(datasetId, headerRow) =>
              reopen(datasetId, {
                sheet: activeDataset?.data.sheet ?? undefined,
                headerRow,
              })
            }
            onFile={(file) => loadFile(file, {})}
          />
          <main className="flex min-w-0 flex-1 flex-col p-4 lg:min-h-0">
            <ChartCanvas
              datasets={datasets}
              open={open}
              charts={charts}
              activeId={active?.spec.id ?? ""}
              onSelectChart={setActiveId}
              onAddChart={handleAddChart}
              onExport={handleExport}
              layout={layout}
              onLayoutChange={setLayout}
              onRemoveChart={(id) =>
                setCharts((previous) => previous.filter((chart) => chart.spec.id !== id))
              }
              onFile={(file) => loadFile(file, {})}
            />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
