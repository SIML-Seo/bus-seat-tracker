// 노선 상세의 정류장 검색. 상태/React에 의존하지 않는 순수 함수.
// 공백·구분 기호는 무시하고, 초성(ㅅㄷㅇ)이나 초성이 섞인 입력(사ㄷ)으로도 찾는다.

import { splitStationName } from '@/app/_shared/route-display';
import { getStopKey, type BusStop, type RouteDirection } from './bus-detail';

// 한글 음절의 초성 (유니코드 음절 배열 순서)
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const SYLLABLES_PER_CHOSEONG = 21 * 28; // 중성 21 × 종성 28

// 검색에서 무시하는 글자: 공백과 정류장명에 흔한 구분 기호 (예: '강남역.신분당선')
const IGNORED_CHAR = /[\s.·,\-_]/;

const getChoseong = (char: string) => {
  const code = char.charCodeAt(0);
  return code >= HANGUL_SYLLABLE_START && code <= HANGUL_SYLLABLE_END
    ? CHOSEONG[Math.floor((code - HANGUL_SYLLABLE_START) / SYLLABLES_PER_CHOSEONG)]
    : char;
};

// 비교용 글자와, 각 글자의 원래 문자열 위치
const normalize = (text: string) => {
  const chars: string[] = [];
  const positions: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const char = text[index].toLowerCase();
    if (IGNORED_CHAR.test(char)) continue;
    chars.push(char);
    positions.push(index);
  }
  return { chars, positions };
};

// 검색어 글자가 초성만이면 그 초성으로 시작하는 음절과도 맞는다.
const matchesChar = (queryChar: string, nameChar: string) =>
  queryChar === nameChar || (CHOSEONG.includes(queryChar) && getChoseong(nameChar) === queryChar);

export interface MatchRange {
  start: number;
  end: number;
}

// 이름에서 검색어와 맞는 첫 구간 (원래 이름 기준 [start, end)). 없거나 검색어가 비면 null.
export const findStopNameMatch = (name: string, query: string): MatchRange | null => {
  const queryChars = normalize(query).chars;
  if (queryChars.length === 0) return null;

  const { chars, positions } = normalize(name);
  for (let start = 0; start + queryChars.length <= chars.length; start++) {
    if (queryChars.every((queryChar, offset) => matchesChar(queryChar, chars[start + offset]))) {
      return { start: positions[start], end: positions[start + queryChars.length - 1] + 1 };
    }
  }
  return null;
};

export interface StopSearchResult {
  stop: BusStop;
  stopKey: string;
  directionLabel: string;
  match: MatchRange; // (경유) 등 태그를 뺀 정류장명 기준
}

// 노선 순서(방향 → 정류장 순번)대로 검색어와 맞는 정류장.
// 양방향에 모두 있는 정류장은 방향마다 잔여석이 달라 따로 보여준다.
export const searchStops = (directions: RouteDirection[], query: string): StopSearchResult[] => {
  const results: StopSearchResult[] = [];
  directions.forEach(direction => {
    direction.stops.forEach(stop => {
      const match = findStopNameMatch(splitStationName(stop.stationName).base, query);
      if (match) {
        results.push({ stop, stopKey: getStopKey(stop), directionLabel: direction.label, match });
      }
    });
  });
  return results;
};
