/** 브라우저 메모리에 다 들고 있는 구조라 행 수에도 상한이 필요하다. */
export const MAX_ROWS = 100_000

/** 헤더 행 후보로 보여줄 앞부분 행 수. 제목 줄이 이보다 많이 붙는 파일은 드물다. */
export const PREVIEW_ROWS = 10

/** 인코딩을 감지할 때 들여다볼 앞부분(byte). 전체를 두 번 디코딩할 이유가 없다. */
export const ENCODING_PROBE_BYTES = 64 * 1024

/** 구분자를 추측할 때 볼 앞부분(byte)과 행 수. */
export const DELIMITER_PROBE_BYTES = 64 * 1024
export const DELIMITER_PROBE_ROWS = 20

/** 이름이 빈 컬럼에 붙이는 이름. 번호는 1부터라 사용자가 세는 것과 맞는다. */
export const UNNAMED_COLUMN_PREFIX = "열"
