import { FolderOpen } from "lucide-react"

import { Separator } from "@/shared/components/ui/separator"
import { BrandMark } from "@/shared/components/brand-mark"
import { FilePickerButton } from "@/shared/components/file-picker-button"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { ACCEPT_ATTR } from "@/admin/lib/file-constraints"

export function AppHeader({ onFile }: { onFile: (file: File) => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
      <BrandMark />
      <h1 className="text-base leading-none font-bold tracking-[-0.02em]">차트 설정</h1>

      <div className="ml-auto flex items-center gap-1.5">
        <FilePickerButton accept={ACCEPT_ATTR} onFile={onFile}>
          <FolderOpen data-icon="inline-start" />
          파일 열기
        </FilePickerButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ThemeToggle />
      </div>
    </header>
  )
}
