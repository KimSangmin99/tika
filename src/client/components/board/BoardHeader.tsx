'use client';

type BoardHeaderProps = {
  onCreateClick: () => void;
};

// docs/COMPONENT_SPEC.md §2.2 — 검색은 2차 구현, MVP에서는 비활성 placeholder
export const BoardHeader = ({ onCreateClick }: BoardHeaderProps) => (
  <header className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3">
    <h1 className="text-lg font-bold text-gray-900">Tika</h1>

    <div className="flex items-center gap-2">
      <input
        type="search"
        disabled
        placeholder="검색 (준비 중)"
        aria-label="검색"
        className="w-40 rounded border border-gray-200 px-3 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400 sm:w-56"
      />
      <button
        type="button"
        onClick={onCreateClick}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        새 업무
      </button>
    </div>
  </header>
);
