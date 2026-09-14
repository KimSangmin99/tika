'use client';

import type { BoardFilter } from '@/client/hooks/boardFilter';

type FilterBarProps = {
  activeFilter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  counts: { thisWeek: number; overdue: number };
};

const FILTERS: { key: Exclude<BoardFilter, 'all'>; label: string }[] = [
  { key: 'thisWeek', label: '이번주 업무' },
  { key: 'overdue', label: '일정 초과' },
];

// docs/COMPONENT_SPEC.md §2.3 — 활성 필터를 다시 누르면 해제(전체 보기)
export const FilterBar = ({ activeFilter, onFilterChange, counts }: FilterBarProps) => (
  <div className="flex items-center gap-2">
    {FILTERS.map(({ key, label }) => {
      const isActive = activeFilter === key;

      return (
        <button
          key={key}
          type="button"
          aria-pressed={isActive}
          onClick={() => onFilterChange(isActive ? 'all' : key)}
          className={[
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
            isActive
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {label}
          <span className="rounded-full bg-gray-200 px-1.5 text-[11px] text-gray-700">
            {counts[key]}
          </span>
        </button>
      );
    })}
  </div>
);
