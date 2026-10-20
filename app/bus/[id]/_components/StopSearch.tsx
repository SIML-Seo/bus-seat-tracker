import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { SEAT_LEVEL_TEXT_CLASS, formatSeats, getSeatLevel } from '@/app/_shared/seat-level';
import { RouteTag, splitStationName } from '@/app/_shared/route-display';
import type { SeatStat } from '../_lib/bus-detail';
import { searchStops, type StopSearchResult } from '../_lib/stop-search';
import type { DirectionView } from '../_hooks/useBusDetailController';

// 검색어와 맞는 부분을 강조한 정류장명
const HighlightedName = ({ result }: { result: StopSearchResult }) => {
  const { base, tag } = splitStationName(result.stop.stationName);
  const { start, end } = result.match;
  return (
    <>
      {base.slice(0, start)}
      <mark className="bg-transparent font-semibold text-accent">{base.slice(start, end)}</mark>
      {base.slice(end)}
      {tag && <RouteTag>{tag}</RouteTag>}
    </>
  );
};

interface Props {
  directions: DirectionView[];
  stopStats: Map<string, SeatStat>;
  onSelectStop: (stopKey: string) => void;
}

// 노선 안 정류장 검색. 결과에는 방향과 지금 조건의 잔여석을 함께 보여주고,
// 고르면 노선도의 그 정류장으로 이동한다. (WAI-ARIA combobox 패턴)
export const StopSearch = ({ directions, stopStats, onSelectStop }: Props) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const getOptionId = (index: number) => `${baseId}-option-${index}`;

  const results = searchStops(directions, query);
  const hasQuery = query.trim() !== '';
  const showList = isOpen && hasQuery;
  const activeResult = showList ? results[activeIndex] : undefined;

  // 방향키로 고른 항목이 목록 밖에 있으면 보이게 스크롤한다.
  useEffect(() => {
    if (!showList) return;
    document.getElementById(getOptionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    // getOptionId는 baseId로만 정해진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, showList]);

  const select = (result: StopSearchResult) => {
    onSelectStop(result.stopKey);
    setQuery('');
    setIsOpen(false);
    // 모바일 키보드를 닫아 이동한 정류장이 가려지지 않게 한다.
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 Enter·방향키는 IME가 쓰므로 무시한다.
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!hasQuery || results.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setIsOpen(true);
      setActiveIndex(index => (index + step + results.length) % results.length);
    } else if (event.key === 'Enter') {
      if (activeResult) {
        event.preventDefault();
        select(activeResult);
      }
    } else if (event.key === 'Escape') {
      // 목록이 열려 있으면 닫고, 닫혀 있으면 검색어를 지운다.
      if (showList) setIsOpen(false);
      else setQuery('');
    }
  };

  return (
    <div className="relative px-3 pb-2.5">
      <label htmlFor={inputId} className="sr-only">
        정류장 검색
      </label>
      <div className="relative">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        >
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="m10.5 10.5 3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeResult ? getOptionId(activeIndex) : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          placeholder="정류장 이름이나 초성으로 찾기"
          onChange={event => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={handleKeyDown}
          // 모바일에서 16px 미만이면 입력할 때 화면이 확대되므로 sm 이상에서만 줄인다.
          className="h-9 w-full rounded-lg border border-line bg-subtle pl-8 pr-9 text-base text-ink placeholder:text-faint focus:border-accent focus:outline-none sm:text-sm"
        />
        {query && (
          <button
            type="button"
            aria-label="검색어 지우기"
            // 입력창 포커스를 유지해 목록이 닫혔다 열리지 않게 한다.
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="m1.5 1.5 7 7m0-7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <p role="status" className="sr-only">
        {hasQuery ? (results.length > 0 ? `정류장 ${results.length}개` : '일치하는 정류장 없음') : ''}
      </p>

      {showList && (
        <div className="absolute inset-x-3 top-full z-20 -mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">일치하는 정류장이 없습니다.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label="정류장 검색 결과" className="max-h-[min(50vh,22rem)] overflow-y-auto py-1">
              {results.map((result, index) => {
                const stat = stopStats.get(result.stop.stationId);
                const isActive = index === activeIndex;
                return (
                  <li
                    key={result.stopKey}
                    id={getOptionId(index)}
                    role="option"
                    aria-selected={isActive}
                    // 클릭 전에 입력창 blur로 목록이 사라지지 않게 한다.
                    onMouseDown={event => event.preventDefault()}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => select(result)}
                    className={`grid cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 ${isActive ? 'bg-subtle' : ''}`}
                  >
                    <span className="text-right font-mono text-[11px] tabular-nums text-muted">{result.stop.stationSeq}</span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-sm leading-snug text-ink [overflow-wrap:anywhere]">
                        <HighlightedName result={result} />
                      </span>
                      <span className="truncate text-[11px] text-muted">{result.directionLabel}</span>
                    </span>
                    {stat ? (
                      <span className="whitespace-nowrap text-xs text-muted">
                        <b className={`font-mono text-sm font-medium tabular-nums ${SEAT_LEVEL_TEXT_CLASS[getSeatLevel(stat.averageSeats)]}`}>
                          {formatSeats(stat.averageSeats)}
                        </b>
                        석
                      </span>
                    ) : (
                      <span className="whitespace-nowrap text-xs text-faint">데이터 없음</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
