import { useState } from "react"

import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { AppHeader } from "@/admin/components/app-header"
import { SettingsSidebar } from "@/admin/components/settings-sidebar"
import { ChartCanvas } from "@/admin/components/chart-canvas"
import type { CanvasState } from "@/admin/lib/canvas-state"
import {
  createChart,
  duplicateChart,
  withColumns,
  MAX_CHARTS,
  type ChartSpec,
} from "@/shared/lib/chart-spec"
import { addGapColumn } from "@/admin/lib/derive-column"
import { buildDashboard, downloadDashboard } from "@/admin/lib/export-dashboard"
import { validateFile } from "@/admin/lib/file-constraints"
import { parseFile, type ParseOptions } from "@/admin/lib/parse-file"
import { inferColumns, type ColumnInfo, type ColumnType } from "@/shared/lib/infer-types"
import { fillMapping } from "@/shared/lib/mapping-slots"

function App() {
  const [state, setState] = useState<CanvasState>({ status: "empty" })
  // 차트 명세(종류·매핑·집계)는 카드마다 따로다. 데이터와 컬럼만 파일 단위로 공유한다.
  const [charts, setCharts] = useState<ChartSpec[]>(() => [createChart([])])
  const [activeId, setActiveId] = useState("")
  // 추론 결과 + 사용자가 고친 타입. 파일과 함께 갈아치운다.
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  // 시트를 바꾸면 다시 읽어야 해서 원본 파일을 들고 있는다. 데이터가 아니라 참조다.
  const [source, setSource] = useState<File | null>(null)

  // 지운 카드가 선택돼 있었으면 첫 카드로 흘러내린다 — 지울 때 따로 손대지 않아도 된다.
  const active = charts.find((chart) => chart.id === activeId) ?? charts[0]

  async function handleFile(file: File, options: ParseOptions = {}) {
    const problem = validateFile(file)
    if (problem) {
      setState({ status: "error", fileName: file.name, message: problem })
      return
    }

    // 파일이든 시트든 헤더 행이든 바뀌면 컬럼이 통째로 달라진다. 카드도 하나로 되돌린다 —
    // 컬럼이 다 바뀐 마당에 네 장을 붙들고 있으면 전부 같은 차트가 된다.
    // 고르고 있던 차트 종류만 넘겨받는다.
    const fresh = createChart([], active.chartType)
    setCharts([fresh])
    setActiveId(fresh.id)
    setColumns([])
    setSource(file)
    setState({ status: "loading", fileName: file.name })

    try {
      const data = await parseFile(file, options)

      if (data.columns.length === 0) {
        setState({
          status: "error",
          fileName: file.name,
          message: data.sheet
            ? `"${data.sheet}" 시트가 비어 있습니다.`
            : `${data.headerRow}행에서 컬럼을 찾지 못했습니다. 헤더가 다른 줄에 있는지 확인해 주세요.`,
        })
        return
      }
      if (data.rows.length === 0) {
        setState({
          status: "error",
          fileName: file.name,
          message: "헤더만 있고 데이터 행이 없습니다.",
        })
        return
      }

      const inferred = inferColumns(data.columns, data.rows)
      setColumns(inferred)
      // 열자마자 차트가 보여야 한다. 필수 슬롯만 채운다.
      setCharts([{ ...fresh, mapping: fillMapping({}, fresh.chartType, inferred) }])
      setState({ status: "ready", dataset: { name: file.name, size: file.size }, data })
    } catch (error) {
      setState({
        status: "error",
        fileName: file.name,
        message: error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
      })
    }
  }

  /** 시트·헤더 행을 바꾸면 같은 파일을 그 설정으로 다시 읽는다. */
  function reopen(options: ParseOptions) {
    if (source) handleFile(source, options)
  }

  function handleColumnType(name: string, type: ColumnType) {
    const next = columns.map((column) =>
      column.name === name ? { ...column, type } : column
    )
    setColumns(next)
    // 타입이 바뀌면 그 컬럼이 더는 후보가 아닐 수 있다. 모든 카드를 정리한다 —
    // 선택돼 있지 않은 카드도 그 컬럼을 쓰고 있을 수 있다.
    setCharts((previous) => previous.map((chart) => withColumns(chart, next)))
  }

  function handleChartChange(next: ChartSpec) {
    setCharts((previous) => previous.map((chart) => (chart.id === next.id ? next : chart)))
  }

  /** 시차 컬럼은 후보로 나타나기만 한다. 묻지도 않았는데 매핑을 바꾸지 않는다. */
  function handleDeriveGap(name: string) {
    if (state.status !== "ready") return
    const derived = addGapColumn(state.data, name)
    if (!derived) return
    setState({ ...state, data: derived.data })
    setColumns((previous) => [...previous, derived.column])
  }

  /** API가 붙기 전까지의 임시 통로. 나중에 이 자리가 POST /api/charts가 된다. */
  function handleExport() {
    if (state.status !== "ready") return
    downloadDashboard(buildDashboard(state.dataset, state.data, columns, charts))
  }

  function handleAddChart() {
    if (charts.length >= MAX_CHARTS) return
    const added = duplicateChart(active)
    setCharts((previous) => [...previous, added])
    setActiveId(added.id)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <AppHeader onFile={handleFile} />
        {/*
          세로로 쌓일 때는 캔버스가 먼저다. 설정이 위에 있으면 스크롤을 한참 내려야
          차트가 나온다 — 파일을 열기 전에는 드롭존이 먼저 보여서 그것도 맞다.
        */}
        <div className="flex flex-1 flex-col-reverse lg:min-h-0 lg:flex-row">
          <SettingsSidebar
            dataset={state.status === "ready" ? state.dataset : null}
            data={state.status === "ready" ? state.data : null}
            columns={columns}
            onColumnTypeChange={handleColumnType}
            chart={active}
            chartNumber={charts.indexOf(active) + 1}
            chartCount={charts.length}
            onChartChange={handleChartChange}
            onDeriveGap={handleDeriveGap}
            onSheetChange={(sheet) => reopen({ sheet })}
            onHeaderRowChange={(headerRow) =>
              reopen({
                sheet: state.status === "ready" ? (state.data.sheet ?? undefined) : undefined,
                headerRow,
              })
            }
            onFile={handleFile}
          />
          <main className="flex min-w-0 flex-1 flex-col p-4 lg:min-h-0">
            <ChartCanvas
              state={state}
              charts={charts}
              activeId={active.id}
              columns={columns}
              onSelectChart={setActiveId}
              onAddChart={handleAddChart}
              onExport={handleExport}
              onRemoveChart={(id) =>
                setCharts((previous) => previous.filter((chart) => chart.id !== id))
              }
              onFile={handleFile}
            />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
