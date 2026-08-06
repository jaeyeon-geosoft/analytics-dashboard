import { ChartTypePicker } from "@/admin/components/chart-type-picker"
import { ChoiceRow } from "@/admin/components/settings-sidebar/choice-row"
import { MappingGuide } from "@/admin/components/settings-sidebar/mapping-guide"
import { MappingMultiSelect } from "@/admin/components/settings-sidebar/mapping-multi-select"
import { MappingSelect } from "@/admin/components/settings-sidebar/mapping-select"
import { SectionLabel } from "@/admin/components/settings-sidebar/section-label"
import { SourceSelect } from "@/admin/components/settings-sidebar/source-select"
import type { AdminDataset } from "@/admin/lib/canvas-state"
import {
  AGGREGATION_LABELS,
  ORDER_LABELS,
  REFERENCE_LABELS,
} from "@/shared/lib/chart-option-labels"
import type { Aggregation, CategoryOrder, Reference } from "@/shared/lib/chart-options"
import {
  DEFAULT_CATEGORY_ORDER,
  withChartType,
  withMapping,
  type ChartSpec,
} from "@/shared/lib/chart-spec"
import type { ColumnInfo } from "@/shared/lib/infer-types"
import {
  MAPPING_SLOTS,
  allowsCategoryOrder,
  allowsReference,
  lockedReason,
  pickedColumns,
  usesAggregation,
  valueColumnLimit,
} from "@/shared/lib/mapping-slots"

/**
 * 선택된 카드가 무엇을 그리는지. 카드가 없으면(파일 열기 전) 통째로 빠진다 —
 * 고를 컬럼이 없는데 빈 선택지만 늘어놓을 이유가 없다.
 */
export function ChartSettings({
  chart,
  columns,
  datasets,
  dataset,
  onChartChange,
  onFileChange,
  onSheetChange,
}: {
  chart: ChartSpec
  columns: ColumnInfo[]
  datasets: AdminDataset[]
  dataset: AdminDataset
  onChartChange: (next: ChartSpec) => void
  onFileChange: (fileId: string) => void
  onSheetChange: (sheet: string) => void
}) {
  const { chartType, mapping, aggregation, reference } = chart
  const sortable = allowsCategoryOrder(chartType, mapping, columns)

  return (
    <>
      <SourceSelect
        datasets={datasets}
        dataset={dataset}
        onFileChange={onFileChange}
        onSheetChange={onSheetChange}
      />

      <section>
        <SectionLabel>차트 종류</SectionLabel>
        <ChartTypePicker
          value={chartType}
          onValueChange={(next) => onChartChange(withChartType(chart, next, columns))}
        />
      </section>

      <section>
        <SectionLabel hint={<MappingGuide chartType={chartType} sortable={sortable} />}>
          매핑
        </SectionLabel>
        <div className="space-y-2">
          {MAPPING_SLOTS[chartType].map((slot) =>
            // 여럿 고르는 슬롯은 드롭다운이 아니라 펼친 목록이다. 고르는 것이 "하나"가
            // 아니라 "어느 것들"이라 닫힌 트리거로는 무엇이 켜져 있는지 안 보인다.
            slot.multiple ? (
              <MappingMultiSelect
                key={slot.key}
                slot={slot}
                columns={columns}
                value={pickedColumns(mapping[slot.key])}
                max={valueColumnLimit(slot, mapping)}
                onValueChange={(next) => onChartChange(withMapping(chart, slot.key, next))}
              />
            ) : (
              <MappingSelect
                key={slot.key}
                slot={slot}
                columns={columns}
                // 하나짜리 슬롯이라도 매핑은 배열을 들고 있을 수 있다(누적 막대를
                // 거쳐온 `값`). 이 줄이 그리는 것은 언제나 하나다.
                value={pickedColumns(mapping[slot.key])[0]}
                locked={lockedReason(slot, chartType, mapping, aggregation === "count")}
                onValueChange={(column) => onChartChange(withMapping(chart, slot.key, column))}
              />
            )
          )}
          {/* 산점도·궤적은 행 하나가 점 하나라 묶을 일이 없다. */}
          {usesAggregation(chartType) && (
            <ChoiceRow<Aggregation>
              id="aggregation"
              label="집계"
              value={aggregation}
              labels={AGGREGATION_LABELS}
              onValueChange={(next) => onChartChange({ ...chart, aggregation: next })}
            />
          )}
          {/*
            정렬은 **범주 축일 때만** 내놓는다. 날짜·숫자 축과 시계열은 축 자체가
            순서라 고를 것이 없다 — 빈 선택지를 늘어놓지 않는다.
          */}
          {sortable && (
            <ChoiceRow<CategoryOrder>
              id="order"
              label="정렬"
              value={chart.order ?? DEFAULT_CATEGORY_ORDER}
              labels={ORDER_LABELS}
              onValueChange={(next) => onChartChange({ ...chart, order: next })}
            />
          )}
          {allowsReference(chartType) && (
            <ChoiceRow<Reference>
              id="reference"
              label="기준선"
              value={reference}
              labels={REFERENCE_LABELS}
              onValueChange={(next) => onChartChange({ ...chart, reference: next })}
            />
          )}
        </div>
      </section>
    </>
  )
}
