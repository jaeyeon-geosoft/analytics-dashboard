import { useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { SettingsSidebar, type Mapping, type MappingKey } from "@/components/settings-sidebar"
import { ChartCanvas, type CanvasState } from "@/components/chart-canvas"
import type { ChartType } from "@/components/chart-type-picker"
import { validateFile } from "@/lib/file-constraints"
import { parseFile } from "@/lib/parse-file"

function App() {
  const [state, setState] = useState<CanvasState>({ status: "empty" })
  const [chartType, setChartType] = useState<ChartType>("bar")
  // 슬롯 key로 잡아두면 차트 종류를 바꿔도 같은 역할의 선택이 살아남는다.
  const [mapping, setMapping] = useState<Mapping>({})

  async function handleFile(file: File) {
    const problem = validateFile(file)
    if (problem) {
      setState({ status: "error", fileName: file.name, message: problem })
      return
    }

    setMapping({}) // 파일이 바뀌면 컬럼도 바뀐다
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
            chartType={chartType}
            onChartTypeChange={setChartType}
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
