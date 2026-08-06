import { cn } from "@/shared/lib/utils"

/**
 * 값 축 이름. **돌리지 않고 플롯 위에 가로로 놓는다.**
 *
 * 세로로 세우면 한글이 문제가 된다 — `vertical-rl`은 글자를 한 자씩 세워 쌓는 세로쓰기라
 * 책등·간판의 조판이고, 그렇다고 줄을 통째로 180도 돌리면 **글자 하나하나가 뒤집힌다**
 * (실제로 그렇게 나가 있었다). 눕히는 쪽(엑셀식 아래→위)도 되지만, 가로로 두면 아무도
 * 고개를 기울이지 않아도 된다. 이름이 긴 편이라(집계·기준선·`(0부터 아님)`이 붙는다)
 * 읽는 비용이 그대로 값을 오독하는 비용이 된다.
 *
 * 대가는 세로 공간 한 줄이다. 카드 하한(`GRID_MIN_H`)은 건드리지 않았다 — 하한을 올리면
 * 이미 저장된 7칸짜리 카드가 열 때마다 늘어나 같은 대시보드가 달라진다(절대 원칙 1).
 *
 * `color`는 축이 둘일 때만 들어온다. 이름 옆의 색 마크가 "이 축은 이 선의 것"을
 * 잇는다 — 글자 자체는 시리즈 색으로 칠하지 않는다(CLAUDE.md).
 */
export function AxisName({
  label,
  color,
  align,
}: {
  label: string
  color?: string
  align?: "right"
}) {
  return (
    <p
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[10px] font-medium tracking-[0.06em] text-muted-foreground",
        align === "right" && "justify-end"
      )}
      title={label}
    >
      {color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />}
      <span className="truncate">{label}</span>
    </p>
  )
}
