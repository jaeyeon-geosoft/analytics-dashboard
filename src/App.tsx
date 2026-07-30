import { useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { SettingsSidebar } from "@/components/settings-sidebar"
import { ChartCanvas, type CanvasState } from "@/components/chart-canvas"
import type { ChartType } from "@/components/chart-type-picker"
import type { Aggregation } from "@/lib/aggregate"
import { validateFile } from "@/lib/file-constraints"
import { parseFile, type ParseOptions } from "@/lib/parse-file"
import { inferColumns, type ColumnInfo, type ColumnType } from "@/lib/infer-types"
import { fillMapping, pruneMapping, type Mapping, type MappingKey } from "@/lib/mapping-slots"

function App() {
  const [state, setState] = useState<CanvasState>({ status: "empty" })
  const [chartType, setChartType] = useState<ChartType>("bar")
  // 슬롯 key로 잡아두면 차트 종류를 바꿔도 같은 역할의 선택이 살아남는다.
  const [mapping, setMapping] = useState<Mapping>({})
  // 추론 결과 + 사용자가 고친 타입. 파일과 함께 갈아치운다.
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [aggregation, setAggregation] = useState<Aggregation>("sum")
  // 시트를 바꾸면 다시 읽어야 해서 원본 파일을 들고 있는다. 데이터가 아니라 참조다.
  const [source, setSource] = useState<File | null>(null)

  async function handleFile(file: File, options: ParseOptions = {}) {
    const problem = validateFile(file)
    if (problem) {
      setState({ status: "error", fileName: file.name, message: problem })
      return
    }

    // 파일이든 시트든 헤더 행이든 바뀌면 컬럼이 통째로 달라진다.
    setMapping({})
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
            aggregation={aggregation}
            onAggregationChange={setAggregation}
            onSheetChange={(sheet: string) => source && handleFile(source, { sheet })}
            onHeaderRowChange={(headerRow: number) =>
              source &&
              handleFile(source, {
                sheet: state.status === "ready" ? (state.data.sheet ?? undefined) : undefined,
                headerRow,
              })
            }
            onFile={handleFile}
          />
          <main className="min-w-0 flex-1 p-4 lg:min-h-0">
            <ChartCanvas
              state={state}
              chartType={chartType}
              mapping={mapping}
              aggregation={aggregation}
              columns={columns}
              onFile={handleFile}
            />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default App
