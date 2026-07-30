# 진행 상황

마지막 갱신: 2026-07-30

## 지금 단계

**UI 셸 완료, 데이터 로직 미착수.**

화면(헤더·사이드바·캔버스·각 상태)은 다 만들어져 있고, 파일을 열면 확장자와 크기까지
검증한다. 그 다음 — 파싱, 컬럼 타입 추론, 차트 렌더링 — 은 아직 없다.

UI 셸과 데이터 로직을 일부러 분리해서 진행 중이다. 셸을 먼저 고정해두면 파서를 붙일 때
화면 구조를 다시 흔들 일이 없다.

## 화면 구조

```
┌─ AppHeader (h-14) ───────────────────────────────┐
│  워드마크          [파일 열기] │ [테마 토글]      │
├─ SettingsSidebar (w-72) ─┬─ main ────────────────┤
│  데이터셋                 │  ChartCanvas         │
│  차트 종류 (7종 피커)      │   empty   드롭존      │
│  매핑 (종류별로 다름)      │   loading 스켈레톤+진행률│
│                          │   error   Alert+드롭존 │
│  ─ 로컬 전용 계약 3줄 ─    │   ready   플롯 프레임  │
└──────────────────────────┴───────────────────────┘
```

`lg` 미만에서는 사이드바가 위로 쌓이고 페이지가 스크롤된다.

| 파일 | 역할 |
|---|---|
| `src/App.tsx` | 상태 보유(`CanvasState`, `ChartType`), 파일 핸들러 |
| `src/components/app-header.tsx` | 워드마크, 파일 열기, 테마 토글 |
| `src/components/settings-sidebar.tsx` | 데이터셋 카드 / 차트 종류 / 매핑(`MAPPING_SLOTS`) / 로컬 전용 계약 |
| `src/components/chart-type-picker.tsx` | 7종 피커(막대/가로 막대/누적 막대/선/영역/산점도/원형) + 직접 그린 마크 글리프 |
| `src/components/chart-canvas.tsx` | 캔버스 4개 상태 |
| `src/components/file-dropzone.tsx` | 드래그&드롭 + 파일 선택 |
| `src/components/theme-toggle.tsx` | 라이트/다크 (`localStorage`, 데이터 아님) |
| `src/lib/file-constraints.ts` | 확장자 목록, 크기 상한, `validateFile()` |

## 파서가 붙을 자리

`src/App.tsx`의 `handleFile()`. 지금은 `validateFile()`을 통과하면 바로 `ready`로 넘어간다.
파서가 붙으면 이렇게 된다:

```
validateFile() 통과
  → setState({ status: "loading", fileName, progress })   ← 아직 호출되는 곳이 없음
  → 파싱 완료 후 setState({ status: "ready", dataset, columns })
  → 파싱 실패 시 setState({ status: "error", ... })
```

`SettingsSidebar`의 `columns` prop이 `[]`로 고정되어 있어 매핑 Select가 항상 비활성이다.
파싱 결과를 여기에 넘기면 살아난다.

## 미결정 사항

- **CSV/TSV 파서** (papaparse 등) — 의존성 추가 전 확인 필요
- **Excel 파서** (SheetJS 등) — 시트 선택 UI가 함께 필요
- **상태관리** — 아직 `useState`로 충분. 매핑 선택과 파싱 결과가 들어오면 재검토

## 차트 종류별 매핑 슬롯

사이드바의 "매핑" 섹션은 선택된 차트 종류에 따라 라벨과 슬롯 개수가 바뀐다.
정의는 `settings-sidebar.tsx`의 `MAPPING_SLOTS`에 있다.

| 종류 | 슬롯 |
|---|---|
| 막대 / 가로 막대 | 범주, 값, 분할*(선택)* |
| 누적 막대 | 범주, 값, 누적 기준 |
| 선 / 영역 / 산점도 | X축, Y축, 분할*(선택)* |
| 원형 | 범주, 값 |

선택 슬롯은 placeholder가 `없음`, 필수 슬롯은 `컬럼 선택`으로 나온다. 누적 막대의
누적 기준이 필수인 이유는 그게 없으면 그냥 막대이기 때문이다.

막대·원형은 역할 이름(범주/값)을, 선·산점도는 축 이름(X축/Y축)을 쓴다 — 후자는 양쪽이
모두 수치라서 역할로 부를 이름이 없다.

### 선택값은 슬롯 key로 살아남는다

선택 상태는 `App.tsx`가 `Mapping`(= `Partial<Record<MappingKey, string>>`)으로 들고 있다.
차트 종류를 바꿔도 **같은 key면 선택한 컬럼이 유지**된다.

```
막대   범주=region  값=—  분할=quarter
 → 선   X축=—  Y축=—  분할=quarter      (series만 넘어옴)
 → 원형  범주=region  값=—               (category가 되살아남)
 → 막대  범주=region  값=—  분할=quarter  (원래대로)
```

`category`와 `x`는 역할이 달라서 서로 넘어가지 않는다. 현재 종류에 없는 슬롯의 값도
버리지 않고 들고 있다가 되돌아오면 복원한다. 새 파일을 열면 컬럼 자체가 바뀌므로
`handleFile`에서 전부 비운다.

선택 슬롯(분할)은 목록 맨 위의 `없음` 항목으로 되돌릴 수 있다. Radix `SelectItem`이 빈
문자열 value를 못 받아서, `없음`은 `none`을 쓰고 **컬럼 쪽에 `col:` 접두사를 붙인다** —
이러면 `none`이라는 이름의 컬럼이 있어도 겹치지 않는다. 선택 슬롯은 비어 있을 때도
`none`이 실제로 선택된 상태라서 목록에 체크 표시가 남는다.

## 확인된 함정

- **Radix `TooltipTrigger asChild`로 `ToggleGroupItem`을 감싸지 말 것.** 툴팁 트리거의
  props가 나중에 spread되어 `data-state` / `value` / `aria-pressed`를 덮어쓴다. 선택 상태
  스타일과 라디오 시맨틱이 조용히 죽는다. 차트 종류 피커는 이 때문에 툴팁 대신 선택된
  종류의 설명을 아래에 상시 노출하는 방식으로 바꿨다.
- `ToggleGroup`의 기본 `className`에 `w-fit`이 있다. grid로 쓰려면 `w-full`을 같이 줘야 한다.
- **Radix `SelectItem`의 value에 제어 문자를 넣지 말 것.** 처음에 "없음" 항목의 value로
  `"\0clear"`(NUL 시작)를 썼더니 항목은 렌더링되는데 클릭해도 `onValueChange`가 안 불리고
  체크 상태도 안 잡혔다 — 에러 없이 조용히 무시된다. 평범한 문자열 + 접두사로 해결했다.

## 남아 있는 lint 에러

`ui/badge.tsx`, `ui/button.tsx`, `ui/toggle.tsx`의 `react-refresh/only-export-components`
3건. shadcn CLI가 생성한 파일이고 컴포넌트와 `cva` variants를 함께 export하는 구조 때문이다.
생성 파일이라 손대지 않았다.
