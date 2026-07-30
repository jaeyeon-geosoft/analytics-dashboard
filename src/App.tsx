import { useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { SettingsSidebar } from "@/components/settings-sidebar"
import { ChartCanvas, type CanvasState } from "@/components/chart-canvas"
import type { ChartType } from "@/components/chart-type-picker"
import { validateFile } from "@/lib/file-constraints"
import { parseFile } from "@/lib/parse-file"
import { inferColumns, type ColumnInfo, type ColumnType } from "@/lib/infer-types"
import { fillMapping, pruneMapping, type Mapping, type MappingKey } from "@/lib/mapping-slots"

function App() {
  const [state, setState] = useState<CanvasState>({ status: "empty" })
  const [chartType, setChartType] = useState<ChartType>("bar")
  // 슬롯 key로 잡아두면 차트 종류를 바꿔도 같은 역할의 선택이 살아남는다.
  const [mapping, setMapping] = useState<Mapping>({})
  // 추론 결과 + 사용자가 고친 타입. 파일과 함께 갈아치운다.
  const [columns, setColumns] = useState<ColumnInfo[]>([])

  async function handleFile(file: File) {
    const problem = validateFile(file)
    if (problem) {
      setState({ status: "error", fileName: file.name, message: problem })
      return
    }

    setMapping({}) // 파일이 바뀌면 컬럼도 바뀐다
    setColumns([])
    setState({ status: "loading", fileName: file.name })

    try {
      const data = await parseFile(file)

      if (data.columns.length === 0) {
        setState({
          status: "error",
          fileName: file.name,
          message: "컬럼을 찾지 못했습니다. 첫 줄에 헤더가 있는지 확인해 주세요.",
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
      setMapping(fillMapping({}, chartType, inferred))
      setState({ status: "ready", dataset: { name: file.name, size: file.size }, data })
    } catch (error) {
      setState({
        status: "error",
        fileName: file.name,
        message: error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
      })
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <AppHeader onFile={handleFile} />
        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          <SettingsSidebar
            dataset={state.status === "ready" ? state.dataset : null}
            data={state.status === "ready" ? state.data : null}
            columns={columns}
            onColumnTypeChange={(name: string, type: ColumnType) => {
              const next = columns.map((column) =>
                column.name === name ? { ...column, type } : column
              )
              setColumns(next)
              // 타입이 바뀌면 그 컬럼이 더는 후보가 아닐 수 있다. 비면 다시 채운다.
              setMapping((previous) =>
                fillMapping(pruneMapping(previous, chartType, next), chartType, next)
              )
            }}
            chartType={chartType}
            onChartTypeChange={(next: ChartType) => {
              setChartType(next)
              setMapping((previous) =>
                fillMapping(pruneMapping(previous, next, columns), next, columns)
              )
            }}
            mapping={mapping}
            onMappingChange={(key: MappingKey, column?: string) =>
              setMapping((previous) => {
                const next = { ...previous }
                if (column) next[key] = column
                else delete next[key]
                return next
              })
            }
            onFile={handleFile}
          />
          <main className="min-w-0 flex-1 p-4 lg:min-h-0">
            <ChartCanvas state={state} onFile={handleFile} />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
