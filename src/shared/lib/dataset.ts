/**
 * 차트가 실제로 먹는 최소 형태 — 컬럼 이름과 행.
 *
 * 어드민의 `ParsedFile`은 여기에 인코딩·시트·헤더 행 같은 **파싱할 때만 의미 있는 것**을
 * 더 얹은 모양이라 그대로 대입된다. 뷰어는 API 응답에서 이 모양만 만들면 된다.
 * 렌더러가 `ParsedFile`을 직접 받으면 `shared/`가 `admin/`을 import하게 된다 — 방향이 거꾸로다.
 */
export type DataFrame = {
  columns: string[]
  rows: Record<string, string>[]
}
