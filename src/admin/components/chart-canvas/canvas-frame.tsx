/** 파일을 열기 전의 캔버스 상자. 열고 나면 격자가 이 자리를 대신한다. */
export function CanvasFrame({
  title,
  children,
}: {
  title?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex h-full min-h-[26rem] flex-col rounded-2xl border border-border bg-card lg:min-h-0">
      {title && <header className="shrink-0 border-b border-border px-5 py-3.5">{title}</header>}
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
    </section>
  )
}
