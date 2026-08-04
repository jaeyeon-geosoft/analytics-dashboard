/**
 * 뷰어 화면 — 아직 껍데기다.
 *
 * 여기서 API로 `ChartSpec`과 데이터를 받아 `@/shared/components/chart-card`로 그린다.
 * 설정 UI는 없다. 무엇을 받을지는 아직 안 정했다(PROGRESS.md "미결정 사항").
 */
export default function ViewerApp() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">뷰어는 아직 API에 연결되지 않았다.</p>
    </div>
  )
}
