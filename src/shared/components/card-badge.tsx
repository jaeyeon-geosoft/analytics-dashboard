import { cn } from "@/shared/lib/utils"

/**
 * 카드 번호.
 *
 * 이 배지는 세 곳에 **같은 모양으로** 선다 — 파일 목록(이 파일을 쓰는 카드), 사이드바
 * 머리줄(지금 편집 중인 카드), 캔버스 카드. 셋이 같은 번호로 꿰여야 "어느 파일이 어느
 * 카드로 가는지"가 글로 설명하지 않아도 읽힌다. 파일을 닫을 때 무엇이 함께 사라지는지도
 * 여기서 보인다.
 *
 * **모양이 한 곳에 있어야 그 약속이 지켜진다.** 예전에는 사이드바와 캔버스가 클래스
 * 문자열을 따로 들고 있어서 한쪽만 고치면 조용히 어긋났다.
 *
 * `onSelect`를 주면 버튼이 된다 — 캔버스 카드에서는 이 배지가 키보드로 카드를 고르는
 * 자리이기도 하다. 안 주면 그냥 표시라서 `<span>`으로 선다.
 */
export function CardBadge({
  number,
  current,
  label,
  onSelect,
  className,
}: {
  number: number
  /** 지금 편집 중인 카드인지. 반전된 표면으로 다른 번호와 갈린다. */
  current?: boolean
  /** 버튼일 때의 이름. 화면에는 번호만 보이므로 스크린 리더가 읽을 것을 따로 준다. */
  label?: string
  onSelect?: () => void
  className?: string
}) {
  const surface = current ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
  const shape =
    "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums"

  if (!onSelect) {
    return <span className={cn(shape, surface, className)}>{number}</span>
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={current}
      className={cn(shape, "transition-colors", surface, className)}
    >
      {number}
    </button>
  )
}
