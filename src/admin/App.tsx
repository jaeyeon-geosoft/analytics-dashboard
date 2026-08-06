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
import { addGapColumn } from "@/admin/lib/derive-column"
import { buildDashboard, downloadDashboard } from "@/admin/lib/export-dashboard"
import { validateFile } from "@/admin/lib/file-constraints"
import { parseFile, type ParsedFile, type ParseOptions } from "@/admin/lib/parse-file"
import { inferColumns, type ColumnType } from "@/shared/lib/infer-types"

/** 읽은 것을 어디에 놓을지. `loadFile`의 세 갈래가 여기서 갈린다. */
type LoadTarget =
  | { kind: "open" }
  | { kind: "reread"; datasetId: string }
  | { kind: "bind"; chartId: string; fileId: string }

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
  /**
   * 파일을 읽어 데이터셋으로 만든다. 읽은 것을 어디에 놓을지가 `target`이다.
   *
   * - `open` — 새로 연 파일. 데이터셋을 들이고 그걸 보는 카드를 한 장 만든다.
   * - `reread` — 같은 데이터셋을 다른 헤더 행으로 다시 읽는다. **제자리 교체**라
   *   그 데이터셋을 보는 카드가 전부 따라 바뀐다(그게 맞다 — 같은 표를 다시 읽은 것).
   * - `bind` — **그 카드만** 새 데이터셋으로 옮긴다. 시트를 바꿀 때 쓴다. 시트가 다르면
   *   컬럼도 행도 다른 **다른 표**라, 제자리 교체하면 같은 파일을 보던 다른 카드까지
   *   끌려간다(실제로 그랬다).
   */
  async function loadFile(file: File, options: ParseOptions, target: LoadTarget = { kind: "open" }) {
    const rejected = validateFile(file)
    if (rejected) {
      setOpen({ status: "error", fileName: file.name, message: rejected })
      return
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

      if (target.kind === "reread") {
        const { datasetId } = target
        setDatasets((previous) =>
          previous.map((dataset) =>
            dataset.id === datasetId ? { ...dataset, data, columns } : dataset
          )
        )
        // 컬럼이 통째로 달라졌다. **이 데이터셋을 보는 카드만** 다시 맞춘다.
        setCharts((previous) =>
          previous.map((chart) =>
            chart.datasetId === datasetId
              ? { ...chart, spec: withColumns(chart.spec, columns) }
              : chart
          )
        )
      } else if (target.kind === "bind") {
        const dataset = createDataset(file, data, columns, target.fileId)
        setDatasets((previous) => [...previous, dataset])
        setCharts((previous) =>
          previous.map((chart) =>
            chart.spec.id === target.chartId
              ? { ...chart, datasetId: dataset.id, spec: withColumns(chart.spec, columns) }
              : chart
          )
        )
      } else {
        const dataset = createDataset(file, data, columns)
        setDatasets((previous) => [...previous, dataset])
        // 열자마자 차트가 보여야 한다. 고르고 있던 차트 종류만 넘겨받고 필수 슬롯을 채운다.
        // 카드가 이미 상한이면 파일만 들인다 — 그 사실은 캔버스 바가 말하고, 기존 카드의
        // "파일" 선택으로 이 파일을 볼 수 있다.
        if (charts.length < MAX_CHARTS) {
          const spec = createChart(columns, active?.spec.chartType)
          setCharts((previous) => [...previous, { spec, datasetId: dataset.id }])
          setActiveId(spec.id)
        }
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

  /** 헤더 행을 바꾸면 같은 표를 그 설정으로 다시 읽는다. 같은 데이터셋 자리에 들어간다. */
  function handleHeaderRow(datasetId: string, headerRow: number) {
    const dataset = datasets.find((entry) => entry.id === datasetId)
    if (!dataset) return
    loadFile(
      dataset.source,
      { sheet: dataset.data.sheet ?? undefined, headerRow },
      { kind: "reread", datasetId }
    )
  }

  /**
   * 선택된 카드가 볼 시트를 바꾼다.
   *
   * **데이터셋을 갈아끼우지 않고 새로 만든다.** 시트가 다르면 다른 표라서, 제자리에서
   * 바꾸면 같은 파일을 보던 다른 카드까지 함께 끌려간다. 이미 들여둔 시트면 그걸
   * 가리키기만 하므로 다시 읽지 않는다.
   */
  function handleChartSheet(sheet: string) {
    if (!active) return
    const current = datasets.find((entry) => entry.id === active.datasetId)
    if (!current || current.data.sheet === sheet) return

    const loaded = datasets.find(
      (entry) => entry.fileId === current.fileId && entry.data.sheet === sheet
    )
    if (loaded) {
      bindChart(active.spec.id, loaded)
      return
    }
    loadFile(
      current.source,
      { sheet },
      { kind: "bind", chartId: active.spec.id, fileId: current.fileId }
    )
  }

  /** 카드를 이미 들여둔 데이터셋에 붙인다. 컬럼이 달라지므로 매핑을 다시 맞춘다. */
  function bindChart(chartId: string, dataset: AdminDataset) {
    setCharts((previous) =>
      previous.map((chart) =>
        chart.spec.id === chartId
          ? { ...chart, datasetId: dataset.id, spec: withColumns(chart.spec, dataset.columns) }
          : chart
      )
    )
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

  /**
   * 선택된 카드가 볼 파일을 바꾼다. 고르는 단위는 **파일**이라, 그 파일에서 들여둔
   * 시트 중 첫 번째로 붙는다 — 시트는 아래 줄에서 따로 고른다.
   */
  function handleChartFile(fileId: string) {
    const dataset = datasets.find((entry) => entry.fileId === fileId)
    if (active && dataset) bindChart(active.spec.id, dataset)
  }

  /**
   * 파일을 닫으면 그 파일을 보던 카드도 함께 사라진다 — 데이터가 없는 카드는 그릴 것이
   * 없다. 무엇이 함께 사라지는지는 파일 줄의 번호 배지가 미리 보여준다.
   */
  function handleCloseDataset(datasetId: string) {
    setDatasets((previous) => previous.filter((entry) => entry.id !== datasetId))
    setCharts((previous) => previous.filter((chart) => chart.datasetId !== datasetId))
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
            datasets={datasets}
            charts={charts}
            chart={active}
            chartNumber={active ? charts.indexOf(active) + 1 : 0}
            onColumnTypeChange={handleColumnType}
            onChartChange={handleChartChange}
            onChartFile={handleChartFile}
            onChartSheet={handleChartSheet}
            onDeriveGap={handleDeriveGap}
            onHeaderRowChange={handleHeaderRow}
            onCloseDataset={handleCloseDataset}
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
