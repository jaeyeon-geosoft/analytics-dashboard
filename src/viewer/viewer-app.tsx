import { useRef, useState } from "react"
import { AlertTriangle, FolderOpen, Lock, LockOpen, RotateCcw } from "lucide-react"
import type { Layout } from "react-grid-layout"

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { BrandMark } from "@/shared/components/brand-mark"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import type { Dashboard } from "@/shared/lib/dashboard"
import { DashboardGrid } from "@/viewer/components/dashboard-grid"
import { isMoved, layoutFrom } from "@/viewer/view-layout"
import { loadDashboardFile } from "@/viewer/load-dashboard"

export default function ViewerApp() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  /**
   * 지금 화면의 배치. 대시보드를 열 때 저장된 값으로 채우고, 그 뒤로는 보는 사람이
   * 옮긴 것을 담는다. **어디에도 저장하지 않는다** — 새로고침하면 저장된 배치로
   * 돌아온다(절대 원칙 4: 진실의 원천은 어드민이 저장한 대시보드다).
   */
  const [layout, setLayout] = useState<Layout>([])
  /** 뷰어는 잠긴 채로 열린다 — 기본은 "설정한 그대로"다(절대 원칙 1). */
  const [locked, setLocked] = useState(true)

  async function open(file: File) {
    const result = await loadDashboardFile(file)
    if (result.ok) {
      setDashboard(result.dashboard)
      setLayout(layoutFrom(result.dashboard))
      // 다른 대시보드는 그 대시보드가 저장한 배치로 다시 시작한다.
      setLocked(true)
      setProblem(null)
    } else {
      // 무엇이 잘못됐는지 보여준다. 빈 화면을 그리지 않는다(절대 원칙 3).
      setProblem(result.reason)
    }
  }

  const moved = dashboard ? isMoved(layout, dashboard) : false

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-dvh flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          {/* 어드민과 같은 마크. 두 화면이 한 제품이라는 것을 여기서 보여준다. */}
          <BrandMark />
          <div className="min-w-0 flex-1">
            {dashboard ? (
              <>
                <h1 className="truncate text-base font-bold tracking-[-0.02em]">
                  {dashboard.title}
                </h1>
                {/* 어느 파일에서 나온 차트인지 밝힌다 — 대시보드 하나에 파일이 섞일 수 있다. */}
                <p className="truncate font-mono text-xs text-muted-foreground">
                  차트 {dashboard.charts.length}장 ·{" "}
                  {dashboard.datasets.map((dataset) => dataset.name).join(", ")}
                </p>
              </>
            ) : (
              <h1 className="text-base leading-none font-bold tracking-[-0.02em]">차트 보기</h1>
            )}
          </div>
          {dashboard && (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={!locked}
              // 좁은 화면에서는 글자가 빠지고 아이콘만 남는다. 이름은 남겨야 한다.
              aria-label={locked ? "배치 바꾸기" : "배치 잠그기"}
              onClick={() => setLocked((was) => !was)}
            >
              {locked ? <LockOpen /> : <Lock />}
              <span className="hidden sm:inline">{locked ? "배치 바꾸기" : "배치 잠그기"}</span>
            </Button>
          )}
          <OpenButton onFile={open} label={dashboard ? "다른 대시보드" : "대시보드 열기"} />
          <Separator orientation="vertical" className="h-6" />
          <ThemeToggle />
        </header>

        {dashboard ? (
          <>
            {/*
              잠금이 풀린 동안만 나오는 줄. 옮긴 배치가 남지 않는다는 것을 여기서
              밝힌다 — 말하지 않으면 저장된 줄 알고 새로고침에서 잃는다.
            */}
            {!locked && (
              <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted/40 px-4 py-2">
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  카드를 끌어 옮기고 오른쪽 아래 모서리로 크기를 바꿉니다. 옮긴 배치는 저장되지
                  않고, 새로고침하면 원래대로 돌아옵니다.
                </p>
                {moved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setLayout(layoutFrom(dashboard))}
                  >
                    <RotateCcw />
                    원래 배치로
                  </Button>
                )}
              </div>
            )}
            {/* 스크롤은 여기가 맡는다. 스크롤바 자리를 미리 비워둬야 폭이 진동하지 않는다 —
                폭이 흔들리면 Recharts의 ResponsiveContainer가 재측정에 빠진다(CLAUDE.md). */}
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
              <DashboardGrid
                dashboard={dashboard}
                layout={layout}
                onLayoutChange={setLayout}
                locked={locked}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md">
              {problem && (
                <Alert variant="destructive" className="mb-5">
                  <AlertTriangle />
                  <AlertTitle>대시보드를 열지 못했습니다</AlertTitle>
                  <AlertDescription>{problem}</AlertDescription>
                </Alert>
              )}
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-sm">어드민에서 내보낸 대시보드를 여세요.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  API가 붙기 전까지의 임시 통로입니다.
                </p>
                <OpenButton onFile={open} label="대시보드 열기" className="mt-5" />
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

/** 같은 버튼이 헤더와 빈 화면 두 곳에 선다. 숨은 input을 버튼이 대신 누른다. */
function OpenButton({
  onFile,
  label,
  className,
}: {
  onFile: (file: File) => void
  label: string
  className?: string
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          // 같은 파일을 다시 골라도 change가 나게 비운다.
          event.target.value = ""
        }}
      />
      <Button variant="outline" size="sm" className={className} onClick={() => input.current?.click()}>
        <FolderOpen />
        {label}
      </Button>
    </>
  )
}
