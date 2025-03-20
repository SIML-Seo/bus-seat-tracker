'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';

// 타입 정의
interface BusRoute {
  id: string;
  routeName: string;
  type: string;
  routeTypeName?: string;
  startStopName: string;
  endStopName: string;
  company?: string;
  turnStationId?: string;
  turnStationName?: string;
}

interface BusStopSeat {
  id: string;
  busRouteId: string;
  stopId: string;
  stopName: string;
  averageSeats: number;
  dayOfWeek: number;
  hourOfDay: number;
  samplesCount: number;
}

interface BusStop {
  busRouteId: string;
  stationId: string;
  stationName: string;
  stationSeq: number;
  x?: number;
  y?: number;
}

// 데이터 페칭 함수
const fetcher = (url: string) => fetch(url).then(res => res.json());

// 요일 매핑
const DAY_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const USE_WEEKDAY_BY_DEFAULT = true;

// 필터 타입 정의
type FilterPreset = 'all' | 'weekday' | 'weekend';

export default function BusDetail() {
  const params = useParams();
  const busId = params.id as string;
  
  // 필터 상태 - 다중 요일 선택을 위해 배열로 변경
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stations' | 'stats'>('stations');
  const [activePreset, setActivePreset] = useState<FilterPreset | null>(null);
  
  // 현재 날짜/시간 기반 기본값 설정
  useEffect(() => {
    if (!USE_WEEKDAY_BY_DEFAULT) {
      const now = new Date();
      // 현재 요일을 기본값으로 설정
      setSelectedDays([now.getDay()]);
    } else {
      // 평일(월~금)을 기본값으로 설정
      setSelectedDays([1, 2, 3, 4, 5]);
    }
    // 시간은 선택하지 않음 (모든 시간 표시)
    setSelectedHour(null);
  }, []);

  // 버스 정류장 목록 가져오기
  const { data: stopsData, error: stopsError, isLoading: stopsLoading } = useSWR(
    busId ? `/api/buses/${busId}/stops` : null,
    fetcher
  );
  
  // 좌석 데이터 가져오기
  const { data: seatsData, error: seatsError, isLoading: seatsLoading, mutate: mutateSeats } = useSWR(
    busId ? `/api/buses/${busId}/seats${getQueryString()}` : null,
    fetcher
  );
  
  function getQueryString() {
    const params = new URLSearchParams();
    
    // 선택된 요일들을 쿼리 파라미터로 추가
    if (selectedDays.length > 0) {
      selectedDays.forEach(day => {
        params.append('dayOfWeek', day.toString());
      });
    }
    
    if (selectedHour !== null) params.append('hourOfDay', selectedHour.toString());
    if (selectedStation !== null) params.append('stopId', selectedStation);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }
  
  // 필터 변경 시 데이터 다시 가져오기
  const handleFilterChange = () => {
    // SWR의 mutate 함수를 사용하여 데이터를 명시적으로 다시 가져옴
    setTimeout(() => mutateSeats(), 0);
    // mutateSeats();
    setActivePreset(null); // 커스텀 필터 설정 시 프리셋 선택 해제
  };
  
  // 프리셋 필터 적용
  const applyFilterPreset = (preset: FilterPreset) => {
    setActivePreset(preset);
    
    switch(preset) {
      case 'all': // 모든 요일 + 모든 시간
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        setSelectedHour(null);
        break;
      case 'weekday': // 평일만 (월~금: 1-5)
        setSelectedDays([1, 2, 3, 4, 5]);
        setSelectedHour(null);
        break;
      case 'weekend': // 주말만 (토,일: 6,0)
        setSelectedDays([0, 6]);
        setSelectedHour(null);
        break;
    }
    
    // 설정 변경 후 데이터 다시 가져오기 (지연 적용)
    setTimeout(() => mutateSeats(), 0);
  };
  
  // 요일 선택/해제 토글
  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays(prev => {
      // 이미 선택된 요일이면 제거, 아니면 추가
      if (prev.includes(dayIndex)) {
        return prev.filter(day => day !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
    handleFilterChange();
  };
  
  // 전체 요일 선택/해제
  const toggleAllDays = () => {
    if (selectedDays.length === 7) {
      // 모든 요일이 선택된 경우 모두 해제
      setSelectedDays([]);
    } else {
      // 모든 요일 선택
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
    handleFilterChange();
  };
  
  // 정류장 선택 시
  const handleStationSelect = (stationId: string) => {
    setSelectedStation(stationId === selectedStation ? null : stationId);
    setViewMode('stats');
    // 데이터 다시 가져오기를 위해 handleFilterChange 호출
    setTimeout(() => handleFilterChange(), 0);
  };
  
  // 좌석 수에 따른 색상 클래스 반환
  const getSeatColorClass = (seatCount: number) => {
    if (seatCount >= 15) return 'bg-green-100 text-green-800';
    if (seatCount >= 11) return 'bg-yellow-100 text-yellow-800';
    if (seatCount >= 6) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };
  
  // 배경색만 있는 좌석 수 클래스 (히트맵용)
  const getSeatBgColorClass = (seatCount: number) => {
    if (seatCount >= 15) return 'bg-green-100';
    if (seatCount >= 11) return 'bg-yellow-100';
    if (seatCount >= 6) return 'bg-orange-100';
    return 'bg-red-100';
  };
  
  // 시간대 옵션 생성 - 운영 시간(6시~22시)만 표시
  const hourOptions = Array.from({ length: 17 }, (_, i) => i + 6);
  
  const isLoading = stopsLoading || seatsLoading;
  const error = stopsError || seatsError;
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3">데이터를 불러오는 중...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-600 mb-6 w-full max-w-md">
          <p className="text-center">데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
        <Link href="/" className="text-blue-600 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }
  
  if (!seatsData || !seatsData.busRoute) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-800 mb-6 w-full max-w-md">
          <p className="text-center">버스 노선 정보를 찾을 수 없습니다.</p>
        </div>
        <Link href="/" className="text-blue-600 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }
  
  const busRoute = seatsData.busRoute as BusRoute;
  const seatData = seatsData.seatData as BusStopSeat[];
  const busStops = stopsData?.stops || [];
  
  // 정류장별로 그룹화된 좌석 데이터
  const seatsByStation = seatData.reduce((acc, seat) => {
    if (!acc[seat.stopId]) {
      acc[seat.stopId] = [];
    }
    acc[seat.stopId].push(seat);
    return acc;
  }, {} as Record<string, BusStopSeat[]>);
  
  // 정류장별 평균 잔여석을 계산하는 함수 (다중 요일 지원)
  const calculateStationAverages = () => {
    // 정류장별로 데이터 그룹화
    const stationAverages: { 
      stopId: string, 
      stopName: string, 
      averageSeats: number,
      samplesCount: number,
      dayInfo: string 
    }[] = [];
    
    // 각 정류장별로 선택된 모든 요일의 데이터를 합쳐서 평균 계산
    Object.entries(seatsByStation).forEach(([stopId, seats]) => {
      // 선택된 요일과 시간대에 맞는 데이터만 필터링
      const filteredSeats = seats.filter(seat => 
        (selectedDays.length === 0 || selectedDays.length === 7 || selectedDays.includes(seat.dayOfWeek)) &&
        (selectedHour === null || seat.hourOfDay === selectedHour)
      );
      
      if (filteredSeats.length > 0) {
        // 가중 평균 계산 (샘플 수를 고려)
        let weightedSum = 0;
        let totalSamples = 0;
        
        filteredSeats.forEach(seat => {
          weightedSum += seat.averageSeats * seat.samplesCount;
          totalSamples += seat.samplesCount;
        });
        
        const averageSeats = totalSamples > 0 ? weightedSum / totalSamples : 0;
        
        // 포함된 요일 정보 구성
        const includedDays = [...new Set(filteredSeats.map(seat => seat.dayOfWeek))].sort((a, b) => a - b);
        
        // 요일 그룹화 (연속된 요일은 범위로 표시)
        let dayInfo = '';
        if (includedDays.length === 7) {
          dayInfo = '전체 요일';
        } else if (includedDays.length === 0) {
          dayInfo = '선택된 요일 없음';
        } else {
          dayInfo = includedDays.map(day => DAY_OF_WEEK[day]).join(', ');
        }
        
        // 시간 정보 추가
        if (selectedHour !== null) {
          dayInfo += ` ${selectedHour}시`;
        } else {
          dayInfo += ' 전체 시간';
        }
        
        // 정류장 이름은 필터링된 데이터가 아닌 원본 데이터에서 가져옴 (어떤 요일이든 동일)
        const stopName = seats.length > 0 ? seats[0].stopName : '';
        
        stationAverages.push({
          stopId,
          stopName: stopName,
          averageSeats,
          samplesCount: totalSamples,
          dayInfo
        });
      }
    });
    
    // 정류장 순서에 따라 정렬
    return stationAverages.sort((a, b) => {
      const stopA = busStops.find(stop => stop.stationId === a.stopId);
      const stopB = busStops.find(stop => stop.stationId === b.stopId);
      return (stopA?.stationSeq || 0) - (stopB?.stationSeq || 0);
    });
  };
  
  const stationAverages = calculateStationAverages();
  
  // 회차 정류장 ID를 기준으로 상행/하행 노선 분리
  const findTurnStationIndex = () => {
    if (busRoute.turnStationId) {
      const turnIndex = busStops.findIndex(stop => stop.stationId === busRoute.turnStationId);
      if (turnIndex !== -1) {
        return turnIndex;
      }
    }
    // 회차 정류장 정보가 없으면 기본값으로 중간 인덱스 반환
    return Math.floor(busStops.length / 2);
  };
  
  const turnStationIndex = findTurnStationIndex();
  const upwardStops = busStops.slice(0, turnStationIndex + 1); // 상행 노선 (시작 - 회차)
  const downwardStops = busStops.slice(turnStationIndex); // 하행 노선 (회차 - 종점)
  
  // 필터 섹션
  const renderFilterSection = () => (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-lg font-semibold mb-4 text-black">데이터 필터</h2>
      
      {/* 필터 프리셋 버튼 */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">빠른 필터</label>
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1 rounded-md text-sm ${
              activePreset === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => applyFilterPreset('all')}
          >
            모든 요일/시간
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm ${
              activePreset === 'weekday'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => applyFilterPreset('weekday')}
          >
            평일
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm ${
              activePreset === 'weekend'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
            onClick={() => applyFilterPreset('weekend')}
          >
            주말
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">요일 (다중 선택 가능)</label>
          <div className="flex flex-wrap gap-2">
            {DAY_OF_WEEK.map((day, index) => (
              <button
                key={index}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedDays.includes(index)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => toggleDaySelection(index)}
              >
                {day}
              </button>
            ))}
            <button
              className={`px-3 py-1 rounded-full text-sm ${
                selectedDays.length === 7
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
              onClick={toggleAllDays}
            >
              전체
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="hourSelect" className="block text-sm font-medium text-gray-700 mb-1">시간대</label>
          <select
            id="hourSelect"
            aria-label="시간대 선택"
            value={selectedHour !== null ? selectedHour : ''}
            onChange={(e) => {
              setSelectedHour(e.target.value ? parseInt(e.target.value) : null);
              handleFilterChange();
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
          >
            <option value="">모든 시간</option>
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}시 ~ {(hour + 1) % 24}시
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {selectedStation && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="flex justify-between items-center">
            <p className="text-sm text-blue-700">
              <span className="font-medium">선택된 정류장: </span>
              {busStops.find((s: BusStop) => s.stationId === selectedStation)?.stationName || '알 수 없음'}
            </p>
            <button 
              className="text-xs text-blue-600 hover:text-blue-800"
              onClick={() => setSelectedStation(null)}
            >
              선택 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* 뒤로가기 링크 */}
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            검색 결과로 돌아가기
          </Link>
        </div>
        
        {/* 버스 정보 헤더 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{busRoute.routeName} 번 버스</h1>
          <div className="mt-2 text-gray-600">
            <p>{busRoute.startStopName} → {busRoute.endStopName}</p>
            <p className="mt-1">노선 유형: {busRoute.routeTypeName || busRoute.type || '일반'}</p>
            {busRoute.company && <p className="mt-1">운수회사: {busRoute.company}</p>}
          </div>
        </div>
        
        {/* 보기 전환 버튼 */}
        <div className="flex gap-4 mb-6">
          <button
            className={`flex-1 py-2 px-4 rounded-md ${
              viewMode === 'stations' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('stations')}
          >
            정류장 목록
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md ${
              viewMode === 'stats' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setViewMode('stats')}
          >
            좌석 통계
          </button>
        </div>
        
        {viewMode === 'stations' ? (
          /* 정류장 목록 - 노선도 스타일 */
          <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
            <h2 className="text-lg font-semibold mb-6 border-b pb-2 text-black">노선도</h2>
            
            {busStops.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                {stopsData?.message ? (
                  <p>{stopsData.message}</p>
                ) : (
                  <p>정류장 정보를 불러올 수 없습니다.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 상행 노선 */}
                <div className="mb-10">
                  <h3 className="font-medium text-gray-700 mb-2">상행 노선: {busRoute.startStopName} → {busRoute.turnStationName || busRoute.endStopName}</h3>
                  <div className="relative w-full py-10">
                    {/* 노선 라인 - 스크롤에 따라 늘어나도록 수정 */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-blue-500 transform -translate-y-1/2" 
                         style={{ minWidth: '100%', width: `${upwardStops.length * 112}px` }}></div>
                    
                    {/* 정류장 목록 */}
                    <div className="flex justify-between" style={{ minWidth: `${upwardStops.length * 112}px` }}>
                      {upwardStops.map((stop: BusStop) => {
                        // 해당 정류장의 평균 좌석 데이터
                        const stopSeats = seatsByStation[stop.stationId];
                        const avgSeats = stopSeats?.reduce((sum, s) => sum + s.averageSeats, 0) / (stopSeats?.length || 1);
                        const isSelected = stop.stationId === selectedStation;
                        const hasData = !isNaN(avgSeats) && avgSeats !== undefined;
                        
                        return (
                          <div 
                            key={stop.stationId} 
                            className="flex flex-col items-center relative px-4"
                            style={{ flex: '0 0 auto', minWidth: '80px' }}
                          >
                            {/* 정류장 이름 (세로로 표시 변경) */}
                            <div className="h-14 mb-1 flex items-end">
                              <span className="text-xs font-medium text-gray-700 text-center line-clamp-2 w-20">{stop.stationName}</span>
                            </div>
                            
                            {/* 정류장 동그라미 - 회차 정류장일 경우 특별한 스타일 적용 */}
                            <button
                              onClick={() => handleStationSelect(stop.stationId)}
                              className={`w-6 h-6 rounded-full border-2 ${
                                isSelected ? 'border-red-500 bg-red-500' : 'border-blue-500 bg-white'
                              } z-10 cursor-pointer hover:bg-blue-100 transition-colors`}
                              title={stop.stationName}
                            ></button>
                            
                            {/* 정류장 번호 */}
                            <span className="text-xs mt-2 text-gray-500">{stop.stationSeq}</span>
                            
                            {/* 평균 좌석 수 배지 - 데이터 없음 표시 추가 */}
                            {hasData ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${getSeatColorClass(avgSeats)}`}>
                                {Math.round(avgSeats * 10) / 10}석
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full mt-1 bg-gray-100 text-gray-600">
                                데이터 없음
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* 하행 노선 */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">하행 노선: {busRoute.turnStationName || busRoute.endStopName} → {busRoute.startStopName}</h3>
                  <div className="relative w-full py-10">
                    {/* 노선 라인 - 스크롤에 따라 늘어나도록 수정 */}
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-green-500 transform -translate-y-1/2"
                         style={{ minWidth: '100%', width: `${downwardStops.length * 112}px` }}></div>
                    
                    {/* 정류장 목록 */}
                    <div className="flex justify-between" style={{ minWidth: `${downwardStops.length * 112}px` }}>
                      {downwardStops.map((stop: BusStop) => {
                        // 해당 정류장의 평균 좌석 데이터
                        const stopSeats = seatsByStation[stop.stationId];
                        const avgSeats = stopSeats?.reduce((sum, s) => sum + s.averageSeats, 0) / (stopSeats?.length || 1);
                        const isSelected = stop.stationId === selectedStation;
                        const hasData = !isNaN(avgSeats) && avgSeats !== undefined;
                        
                        return (
                          <div 
                            key={stop.stationId} 
                            className="flex flex-col items-center relative px-4"
                            style={{ flex: '0 0 auto', minWidth: '80px' }}
                          >
                            {/* 정류장 이름 (세로로 표시 변경) */}
                            <div className="h-14 mb-1 flex items-end">
                              <span className="text-xs font-medium text-gray-700 text-center line-clamp-2 w-20">{stop.stationName}</span>
                            </div>
                            
                            {/* 정류장 동그라미 - 회차 정류장일 경우 특별한 스타일 적용 */}
                            <button
                              onClick={() => handleStationSelect(stop.stationId)}
                              className={`w-6 h-6 rounded-full border-2 ${
                                isSelected ? 'border-red-500 bg-red-500' : 'border-green-500 bg-white'
                              } z-10 cursor-pointer hover:bg-green-100 transition-colors`}
                              title={stop.stationName}
                            ></button>
                            
                            {/* 정류장 번호 */}
                            <span className="text-xs mt-2 text-gray-500">{stop.stationSeq}</span>
                            
                            {/* 평균 좌석 수 배지 - 데이터 없음 표시 추가 */}
                            {hasData ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 ${getSeatColorClass(avgSeats)}`}>
                                {Math.round(avgSeats * 10) / 10}석
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full mt-1 bg-gray-100 text-gray-600">
                                데이터 없음
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 필터 섹션 */}
            {renderFilterSection()}
            
            {/* 좌석 데이터 표시 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <h2 className="text-lg font-semibold p-6 border-b text-black">
                {selectedStation 
                  ? `${busStops.find((s: BusStop) => s.stationId === selectedStation)?.stationName || '선택된 정류장'} 주간 시간대별 잔여석` 
                  : '정류장별 평균 잔여석'}
              </h2>
              
              {selectedStation ? (
                // 선택된 정류장의 시간대별 일주일 데이터 표시 (히트맵 형태)
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">최근 일주일간 시간대별 평균 잔여석</p>
                  </div>
                  
                  {/* 히트맵 표시 */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border bg-gray-50 w-20">요일 / 시간</th>
                          {hourOptions.map(hour => (
                            <th key={hour} className="p-2 border bg-gray-50 text-xs whitespace-nowrap w-24 text-center" style={{ minWidth: '75px' }}>
                              {hour}시~{(hour + 1) % 24}시
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDays.map((dayIndex) => {
                          // 해당 요일, 정류장의 시간대별 데이터 추출
                          const dayData = {};
                          seatData.forEach(seat => {
                            if (seat.dayOfWeek === dayIndex) {
                              dayData[seat.hourOfDay] = seat;
                            }
                          });
                          
                          return (
                            <tr key={dayIndex}>
                              <td className="p-2 border font-medium bg-gray-50">{DAY_OF_WEEK[dayIndex]}요일</td>
                              {hourOptions.map(hour => {
                                const hourData = dayData[hour];
                                const seats = hourData?.averageSeats;
                                const samples = hourData?.samplesCount || 0;
                                
                                return (
                                  <td key={hour} className={`p-2 border text-center w-24 ${samples > 0 ? getSeatBgColorClass(seats) : 'bg-gray-100'}`}>
                                    {samples > 0 ? (
                                      <div>
                                        <div className="font-semibold">{!isNaN(seats) ? `${Math.round(seats * 10) / 10}석` : '데이터 없음'}</div>
                                        <div className="text-xs text-gray-600">{samples}회</div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 flex flex-col">
                                        <span>데이터</span>
                                        <span>없음</span>
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* 색상 범례 */}
                  <div className="mt-5 flex items-center justify-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-100 mr-1"></div>
                        <span className="text-xs">0-5석</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-orange-100 mr-1"></div>
                        <span className="text-xs">6-10석</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-yellow-100 mr-1"></div>
                        <span className="text-xs">11-15석</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 mr-1"></div>
                        <span className="text-xs">15석 이상</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-100 mr-1"></div>
                        <span className="text-xs">데이터 없음</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          정류장
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          평균 잔여석
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          데이터 수
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          기간
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stationAverages.length > 0 ? (
                        stationAverages.map((station, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {station.stopName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeatColorClass(station.averageSeats)}`}>
                                {Math.round(station.averageSeats * 10) / 10}석
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {station.samplesCount}회 측정
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {station.dayInfo}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            선택한 필터에 해당하는 데이터가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* 설명 섹션 */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-md font-semibold text-blue-800 mb-2">데이터 안내</h3>
          <p className="text-sm text-blue-700">
            • 표시된 좌석 수는 수집된 데이터의 평균값입니다.<br />
            • 잔여석이 많을수록 <span className="text-green-600 font-medium">녹색</span>, 적을수록 <span className="text-red-600 font-medium">빨간색</span>으로 표시됩니다.<br />
            • 데이터는 주기적으로로 수집되며, 실시간 정보와 차이가 있을 수 있습니다.<br />
            • 정류장 목록에서 정류장을 클릭하여 해당 정류장의 상세 좌석 정보를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
} 