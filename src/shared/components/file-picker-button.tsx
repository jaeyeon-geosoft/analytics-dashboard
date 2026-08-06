import { Button } from "@/shared/components/ui/button"

/**
 * 파일을 고르는 버튼. `<input type=file>`은 감춰두고 라벨이 버튼 노릇을 한다.
 *
 * 어드민 헤더·드롭존·사이드바와 뷰어의 "대시보드 열기"가 **같은 것을 네 번** 쓰고
 * 있었다. 숨긴 input을 되돌리는 `value = ""`를 한 곳이라도 빠뜨리면 같은 파일을 다시
 * 골랐을 때 아무 일도 일어나지 않는다 — 되풀이할 게 아니라 한 곳에 둘 것.
 */
export function FilePickerButton({
  accept,
  onFile,
  children,
  className,
}: {
  /** `<input accept>`에 그대로 들어간다. 허용 확장자는 부르는 쪽이 안다. */
  accept: string
  onFile: (file: File) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <label className="cursor-pointer">
        {children}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFile(file)
            // 같은 파일을 다시 골라도 change가 나게 비운다.
            event.target.value = ""
          }}
        />
      </label>
    </Button>
  )
}
