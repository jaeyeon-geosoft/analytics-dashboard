import { describeMapping, type ChartSpec } from "@/shared/lib/chart-spec"
import type { ChartType } from "@/shared/lib/chart-types"
import type { DashboardChart, DashboardDataset } from "@/shared/lib/dashboard"
import { inferColumns } from "@/shared/lib/infer-types"
import type { Mapping } from "@/shared/lib/mapping-slots"
import { liveLayout } from "@/viewer/lib/kriso/layout"
import type { ParsedTable } from "@/viewer/lib/kriso/parse-table"

/**
 * 차트 종류는 사용자가 테이블마다 미리 정했다(`tables.ts`) — 여기서는 그 종류가
 * 요구하는 슬롯에 X/Y 컬럼을 꽂기만 한다. 종류를 데이터로 추측하지 않는다.
 */
function mappingFor(chartType: ChartType, xName: string, yNames: string[]): Mapping {
  if (chartType === "line") return { x: xName, y: yNames[0] }
  if (chartType === "stacked") return { category: xName, value: yNames }
  return { category: xName, value: yNames[0] }
}

/** 카드 머리줄과 같은 문장 — 매핑 요약이 없으면(있을 수 없지만) 테이블 이름으로. */
function chartTitle(spec: ChartSpec, fallback: string): string {
  const { axes, aside } = describeMapping(spec)
  if (!axes) return fallback
  return aside ? `${axes} · ${aside}` : axes
}

export function toDatasetAndChart(
  tableName: string,
  chartType: ChartType,
  table: ParsedTable,
  index: number
): { dataset: DashboardDataset; chart: DashboardChart } {
  const columnNames = [table.xName, ...table.yNames]
  const columns = inferColumns(columnNames, table.rows)

  const spec: ChartSpec = {
    id: `chart-${tableName}`,
    chartType,
    mapping: mappingFor(chartType, table.xName, table.yNames),
    aggregation: "sum",
    reference: "none",
    order: "file",
  }

  const dataset: DashboardDataset = {
    id: `dataset-${tableName}`,
    name: tableName,
    columns,
    data: { columns: columnNames, rows: table.rows },
  }

  const chart: DashboardChart = {
    id: spec.id,
    title: chartTitle(spec, tableName),
    datasetId: dataset.id,
    spec,
    layout: liveLayout(index),
  }

  return { dataset, chart }
}
