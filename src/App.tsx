import { useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AppHeader } from "@/components/app-header"
import { SettingsSidebar } from "@/components/settings-sidebar"
import { ChartCanvas, type CanvasState } from "@/components/chart-canvas"
import type { ChartType } from "@/components/chart-type-picker"
import { validateFile } from "@/lib/file-constraints"

function App() {
  const [state, setState] = useState<CanvasState>({ status: "empty" })
  const [chartType, setChartType] = useState<ChartType>("bar")

  function handleFile(file: File) {
    const problem = validateFile(file)
    if (problem) {
      setState({ status: "error", fileName: file.name, message: problem })
      return
    }
    // 파서가 붙는 자리. 여기서 loading으로 바꾸고, 파싱이 끝나면 컬럼과 함께 ready로 넘긴다.
    setState({ status: "ready", dataset: { name: file.name, size: file.size } })
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <AppHeader onFile={handleFile} />
        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          <SettingsSidebar
            dataset={state.status === "ready" ? state.dataset : null}
            columns={[]}
            chartType={chartType}
            onChartTypeChange={setChartType}
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
