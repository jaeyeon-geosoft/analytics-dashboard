import { useState } from "react"
import type { Layout } from "react-grid-layout"

import type { LoadTarget } from "@/admin/hooks/load-target"
import {
  createDataset,
  type AdminChart,
  type AdminDataset,
  type OpenState,
} from "@/admin/lib/canvas-state"
import { addGapColumn } from "@/admin/lib/derive-column"
import { buildDashboard, downloadDashboard } from "@/admin/lib/export-dashboard"
import { validateFile } from "@/admin/lib/file-constraints"
import { parseFile, type ParseOptions } from "@/admin/lib/parse-file"
import { shapeProblem } from "@/admin/lib/shape-problem"
import {
  MAX_CHARTS,
  createChart,
  duplicateChart,
  withColumns,
  type ChartSpec,
} from "@/shared/lib/chart-spec"
import { inferColumns, type ColumnType } from "@/shared/lib/infer-types"

/**
 * 어드민이 들고 있는 것 전부와, 그것을 바꾸는 길들.
 *
 * 화면(`App`)에서 떼어낸 것은 **바뀌는 계기가 다르기 때문**이다 — 여기 있는 것은
 * "파일을 열면 무슨 일이 일어나는가"이고, 화면은 그것을 어디에 놓는가다. 한 파일에
 * 있으면 레이아웃을 손볼 때마다 상태 기계를 함께 읽어야 한다.
 */
export function useAdminWorkspace() {
  // 열어둔 파일들. 카드마다 다른 파일을 붙이는 것이 이 배열 위에 올라간다.
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

  /** 파일을 읽어 데이터셋으로 만든다. 읽은 것을 어디에 놓을지가 `target`이다. */
  async function loadFile(
    file: File,
    options: ParseOptions,
    target: LoadTarget = { kind: "open" }
  ) {
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
  function changeHeaderRow(datasetId: string, headerRow: number) {
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
  function changeChartSheet(sheet: string) {
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
    loadFile(current.source, { sheet }, { kind: "bind", chartId: active.spec.id, fileId: current.fileId })
  }

  /**
   * 선택된 카드가 볼 파일을 바꾼다. 고르는 단위는 **파일**이라, 그 파일에서 들여둔
   * 시트 중 첫 번째로 붙는다 — 시트는 아래 줄에서 따로 고른다.
   */
  function changeChartFile(fileId: string) {
    const dataset = datasets.find((entry) => entry.fileId === fileId)
    if (active && dataset) bindChart(active.spec.id, dataset)
  }

  function changeColumnType(datasetId: string, name: string, type: ColumnType) {
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

  function changeChart(next: ChartSpec) {
    setCharts((previous) =>
      previous.map((chart) => (chart.spec.id === next.id ? { ...chart, spec: next } : chart))
    )
  }

  /**
   * 파일을 닫으면 그 파일을 보던 카드도 함께 사라진다 — 데이터가 없는 카드는 그릴 것이
   * 없다. 무엇이 함께 사라지는지는 파일 줄의 번호 배지가 미리 보여준다.
   */
  function closeDataset(datasetId: string) {
    setDatasets((previous) => previous.filter((entry) => entry.id !== datasetId))
    setCharts((previous) => previous.filter((chart) => chart.datasetId !== datasetId))
  }

  /** 시차 컬럼은 후보로 나타나기만 한다. 묻지도 않았는데 매핑을 바꾸지 않는다. */
  function deriveGap(datasetId: string, name: string) {
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

  function addChart() {
    if (!active || charts.length >= MAX_CHARTS) return
    // 보고 있던 카드를 그대로 한 장 더 — 보던 파일까지 물려받는다.
    const added = { ...active, spec: duplicateChart(active.spec) }
    setCharts((previous) => [...previous, added])
    setActiveId(added.spec.id)
  }

  function removeChart(id: string) {
    setCharts((previous) => previous.filter((chart) => chart.spec.id !== id))
  }

  /** API가 붙기 전까지의 임시 통로. 나중에 이 자리가 POST /api/charts가 된다. */
  function exportDashboard() {
    if (charts.length === 0) return
    downloadDashboard(buildDashboard(datasets, charts, layout))
  }

  return {
    datasets,
    charts,
    open,
    active,
    activeNumber: active ? charts.indexOf(active) + 1 : 0,
    layout,
    setLayout,
    selectChart: setActiveId,
    openFile: (file: File) => loadFile(file, {}),
    changeHeaderRow,
    changeChartSheet,
    changeChartFile,
    changeColumnType,
    changeChart,
    closeDataset,
    deriveGap,
    addChart,
    removeChart,
    exportDashboard,
  }
}
