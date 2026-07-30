import Papa from "papaparse"

/** 브라우저 메모리에 다 들고 있는 구조라 행 수에도 상한이 필요하다. */
export const MAX_ROWS = 100_000

export type ParsedFile = {
  columns: string[]
  rows: Record<string, string>[]
  /** 실제로 디코딩에 쓴 인코딩. 자동 감지가 틀렸을 때 사용자가 알아챌 단서다. */
  encoding: string
  /** 상한에 걸려 뒷부분을 버렸는지 */
  truncated: boolean
  /** 컬럼 수가 헤더와 안 맞는 행의 수 */
  errorCount: number
}

/**
 * 앞부분을 UTF-8로 디코딩해보고 치환 문자(U+FFFD)가 섞이면 CP949로 본다.
 * 한국 Excel의 "CSV(쉼표로 분리)"가 CP949로 저장되기 때문에 필요하다.
 * `stream: true`는 끝에서 잘린 멀티바이트 문자를 치환 문자로 만들지 않게 한다.
 */
function detectEncoding(buffer: ArrayBuffer): string {
  const head = buffer.slice(0, 64 * 1024)
  const text = new TextDecoder("utf-8").decode(head, { stream: true })
  return text.includes("�") ? "euc-kr" : "utf-8"
}

/**
 * 파일 전체를 한 번에 디코딩한 뒤 파싱한다.
 *
 * papaparse의 청크 스트리밍(`chunk` 콜백)을 쓰면 청크마다 따로 디코딩하기 때문에
 * 10MB 경계에 걸친 멀티바이트 문자가 조용히 깨진다 — 37MB 한글 파일에서 실제로 재현됐다.
 * 한 번에 디코딩하면 그 문제가 사라진다. 대신 파싱이 동기라 상한(50MB)에서 200~300ms
 * 정도 메인스레드를 잡는다. 그보다 커지면 Worker로 옮길 것.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  const encoding = detectEncoding(buffer)
  const text = new TextDecoder(encoding).decode(buffer)

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    // 끄고 간다. 켜면 "007"을 조용히 7로 바꿔서 타입 추론이 무의미해진다.
    dynamicTyping: false,
  })

  const truncated = result.data.length > MAX_ROWS

  return {
    columns: result.meta.fields ?? [],
    rows: truncated ? result.data.slice(0, MAX_ROWS) : result.data,
    encoding,
    truncated,
    // FieldMismatch만 센다. 단일 컬럼 파일에서 나오는 UndetectableDelimiter 같은
    // 파일 단위 경고까지 세면 "N개 행 모양이 다름"이 거짓말이 된다.
    errorCount: result.errors.filter((error) => error.type === "FieldMismatch").length,
  }
}
