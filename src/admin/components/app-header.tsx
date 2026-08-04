import { FolderOpen } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Separator } from "@/shared/components/ui/separator"
import { ThemeToggle } from "@/shared/components/theme-toggle"
import { ACCEPT_ATTR } from "@/admin/lib/file-constraints"

export function AppHeader({ onFile }: { onFile: (file: File) => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
        <svg viewBox="0 0 20 18" className="h-[15px] w-4" fill="currentColor" aria-hidden>
          <rect x="2.5" y="8" width="3.5" height="7" rx="1" />
          <rect x="8.25" y="3.5" width="3.5" height="11.5" rx="1" />
          <rect x="14" y="6" width="3.5" height="9" rx="1" />
        </svg>
      </div>
      <h1 className="text-sm font-semibold tracking-tight">차트 뷰어</h1>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild variant="outline" size="sm">
          <label className="cursor-pointer">
            <FolderOpen data-icon="inline-start" />
            파일 열기
            <input
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onFile(file)
                event.target.value = ""
              }}
            />
          </label>
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <ThemeToggle />
      </div>
    </header>
  )
}
