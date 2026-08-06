import { Hint } from "@/admin/components/settings-sidebar/hint"
import { SECTION_HEADING } from "@/admin/components/settings-sidebar/constants"

/** 섹션 제목 한 줄. 설명이 있으면 제목 옆에 ⓘ 하나로 붙는다. */
export function SectionLabel({
  children,
  hint,
}: {
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <h2 className={SECTION_HEADING}>{children}</h2>
      {hint && <Hint>{hint}</Hint>}
    </div>
  )
}
