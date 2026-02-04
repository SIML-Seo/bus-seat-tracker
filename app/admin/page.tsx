'use client';

import { useState, useEffect, useCallback } from 'react';

// 타입 정의
interface Stats {
  todayCollected: number;
  lastCollectionTime: string | null;
  hourlyStats: { hour: number; count: number }[];
  focusGroup: string;
  isHoliday: boolean;
  holidayName: string | null;
  dayOfWeek: number;
  currentHour: number;
}

interface Coverage {
  totalRoutes: number;
  routesWithStats: number;
  coveragePercent: number;
  routeCoverage: Array<{
    busRouteId: string;
    routeName: string;
    totalStops: number;
    stopsWithStats: number;
    coveragePercent: number;
  }>;
  lowSampleRoutes: Array<{
    busRouteId: string;
    routeName: string;
    avgSamples: number;
  }>;
  dayOfWeekDistribution: Array<{
    dayOfWeek: number;
    count: number;
    avgSamples: number | null;
  }>;
  hourDistribution: Array<{
    hour: number;
    count: number;
    avgSamples: number | null;
  }>;
}

interface Storage {
  tables: {
    [key: string]: {
      count: number;
      estimatedMB: number;
    };
  };
  total: {
    estimatedMB: number;
    limitMB: number;
    usagePercent: number;
  };
  cleanup: {
    oldBusLocationCount: number;
    veryOldBusLocationCount: number;
    potentialSavingsMB: number;
  };
}

interface SystemInfo {
  system: {
    currentTime: string;
    localTime: string;
    dayOfWeek: number;
    dayOfWeekName: string;
    hour: number;
    isWeekend: boolean;
    isRushHour: boolean;
    collectionInterval: number;
    isOperatingHours: boolean;
  };
  holiday: {
    isHoliday: boolean;
    holidayName: string | null;
    monthHolidays: Array<{
      date: number;
      name: string;
      isHoliday: boolean;
    }>;
  };
  focusGroup: {
    todaysFocusGroup: string;
    groups: Array<{
      name: string;
      routeCount: number;
      isFocusToday: boolean;
    }>;
  };
  environment: {
    nodeEnv: string;
    hasPublicDataApiKey: boolean;
    hasCronSecret: boolean;
    hasAdminPassword: boolean;
    hasDatabaseUrl: boolean;
  };
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogsResponse {
  logs: LogEntry[];
  files: string[];
  currentFile: string;
  totalLines: number;
  filteredCount: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 데이터 상태
  const [stats, setStats] = useState<Stats | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  
  // 로그 필터
  const [logLevel, setLogLevel] = useState('all');
  const [logKeyword, setLogKeyword] = useState('');
  
  // 정리 설정
  const [cleanupHours, setCleanupHours] = useState(6);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // 세션 스토리지에서 토큰 확인
  useEffect(() => {
    const savedToken = sessionStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // 인증 함수
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '인증 실패');
      }
      
      setToken(data.token);
      sessionStorage.setItem('adminToken', data.token);
      setIsAuthenticated(true);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '인증 실패');
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setToken('');
    setIsAuthenticated(false);
    setStats(null);
    setCoverage(null);
    setStorage(null);
    setSystemInfo(null);
    setLogs(null);
  };

  // API 호출 헬퍼
  const fetchApi = useCallback(async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    if (res.status === 401) {
      handleLogout();
      throw new Error('세션이 만료되었습니다.');
    }
    
    return res.json();
  }, [token]);

  // 데이터 로드
  const loadAllData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Promise.allSettled: 하나가 실패해도 나머지는 정상 처리
      const results = await Promise.allSettled([
        fetchApi('/api/admin/stats'),
        fetchApi('/api/admin/coverage'),
        fetchApi('/api/admin/storage'),
        fetchApi('/api/admin/system'),
        fetchApi(`/api/admin/logs?level=${logLevel}&keyword=${logKeyword}`)
      ]);

      if (results[0].status === 'fulfilled') setStats(results[0].value);
      if (results[1].status === 'fulfilled' && !results[1].value.error) setCoverage(results[1].value);
      if (results[2].status === 'fulfilled') setStorage(results[2].value);
      if (results[3].status === 'fulfilled') setSystemInfo(results[3].value);
      if (results[4].status === 'fulfilled') setLogs(results[4].value);

      // 실패한 항목 로깅
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`${failedCount}개 API 호출 실패`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [token, fetchApi, logLevel, logKeyword]);

  // 인증 후 데이터 로드
  useEffect(() => {
    if (isAuthenticated && token) {
      loadAllData();
    }
  }, [isAuthenticated, token, loadAllData]);

  // 수동 정리 실행
  const handleCleanup = async () => {
    if (!confirm(`${cleanupHours}시간 이상 된 BusLocation 데이터를 삭제하시겠습니까?`)) {
      return;
    }
    
    setLoading(true);
    setCleanupResult(null);
    
    try {
      const result = await fetchApi('/api/admin/cleanup', {
        method: 'POST',
        body: JSON.stringify({ hours: cleanupHours })
      });
      
      setCleanupResult(`${result.deleted}개 데이터 삭제 완료 (남은 데이터: ${result.remaining}개)`);
      // 저장소 데이터 새로고침
      const storageData = await fetchApi('/api/admin/storage');
      setStorage(storageData);
    } catch (err) {
      setCleanupResult(err instanceof Error ? err.message : '정리 실패');
    } finally {
      setLoading(false);
    }
  };

  // 전체 초기화
  const handleResetAll = async () => {
    if (!confirm('모든 데이터를 삭제하시겠습니까?\n\nBusLocation, BusStopSeats, BusStop, BusRoute, Contact\n모든 테이블이 초기화됩니다.\n\n수집 스크립트를 다시 실행해야 합니다.')) {
      return;
    }

    const inputPassword = prompt('전체 초기화를 진행하려면 관리자 비밀번호를 입력하세요:');
    if (!inputPassword) {
      return;
    }

    setLoading(true);
    setCleanupResult(null);

    try {
      const result = await fetchApi('/api/admin/cleanup', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset-all', password: inputPassword })
      });

      if (result.error) {
        setCleanupResult(result.error);
        return;
      }

      const d = result.deleted;
      setCleanupResult(
        `전체 초기화 완료: BusLocation ${d.busLocation.toLocaleString()}개, ` +
        `BusStopSeats ${d.busStopSeats.toLocaleString()}개, ` +
        `BusStop ${d.busStop.toLocaleString()}개, ` +
        `BusRoute ${d.busRoute.toLocaleString()}개, ` +
        `Contact ${d.contact.toLocaleString()}개 삭제`
      );
      await loadAllData();
    } catch (err) {
      setCleanupResult(err instanceof Error ? err.message : '전체 초기화 실패');
    } finally {
      setLoading(false);
    }
  };

  // BusStopSeats 초기화
  const handleResetSeats = async () => {
    if (!confirm('BusStopSeats 데이터를 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.\n삭제 후 데이터 수집을 다시 시작해야 합니다.')) {
      return;
    }
    if (!confirm('정말 삭제하시겠습니까? (2차 확인)')) {
      return;
    }

    setLoading(true);
    setCleanupResult(null);

    try {
      const result = await fetchApi('/api/admin/cleanup', {
        method: 'POST',
        body: JSON.stringify({ action: 'reset-seats' })
      });

      setCleanupResult(`BusStopSeats 초기화 완료: ${result.deleted.toLocaleString()}개 삭제`);
      // 저장소 + 커버리지 새로고침
      const [storageData, coverageData] = await Promise.all([
        fetchApi('/api/admin/storage'),
        fetchApi('/api/admin/coverage')
      ]);
      setStorage(storageData);
      if (!coverageData.error) setCoverage(coverageData);
    } catch (err) {
      setCleanupResult(err instanceof Error ? err.message : '초기화 실패');
    } finally {
      setLoading(false);
    }
  };

  // 로그인 폼
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h1>
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="관리자 비밀번호 입력"
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 대시보드
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">버스 데이터 관리자 대시보드</h1>
          <div className="flex gap-4">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              로그아웃
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 시스템 상태 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">시스템 상태</h2>
            {systemInfo ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">현재 시간:</span>
                  <span>{systemInfo.system.localTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">요일:</span>
                  <span>{systemInfo.system.dayOfWeekName}요일 {systemInfo.system.isWeekend ? '(주말)' : '(평일)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">운영시간:</span>
                  <span className={systemInfo.system.isOperatingHours ? 'text-green-600' : 'text-red-600'}>
                    {systemInfo.system.isOperatingHours ? '운영 중' : '운영 외'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">출퇴근시간:</span>
                  <span className={systemInfo.system.isRushHour ? 'text-orange-600 font-semibold' : ''}>
                    {systemInfo.system.isRushHour ? '예' : '아니오'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">수집 간격:</span>
                  <span>{systemInfo.system.collectionInterval}분</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">공휴일:</span>
                  <span className={systemInfo.holiday.isHoliday ? 'text-red-600' : ''}>
                    {systemInfo.holiday.isHoliday ? systemInfo.holiday.holidayName : '아니오'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">집중 그룹:</span>
                  <span className="font-mono">{systemInfo.focusGroup.todaysFocusGroup}</span>
                </div>
              </div>
            ) : loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <p className="text-red-500 text-sm">데이터를 불러올 수 없습니다.</p>
            )}
          </div>

          {/* 수집 통계 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">수집 통계</h2>
            {stats ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">오늘 수집:</span>
                  <span className="font-semibold">{stats.todayCollected.toLocaleString()}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">마지막 수집:</span>
                  <span>{stats.lastCollectionTime 
                    ? new Date(stats.lastCollectionTime).toLocaleString('ko-KR')
                    : '-'}
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-gray-600 mb-2">시간대별 수집량 (최근 24시간)</p>
                  <div className="flex items-end gap-1 h-20">
                    {stats.hourlyStats.map((h, i) => {
                      const maxCount = Math.max(...stats.hourlyStats.map(s => s.count), 1);
                      const height = (h.count / maxCount) * 100;
                      return (
                        <div
                          key={i}
                          className="bg-blue-500 flex-1 min-w-0"
                          style={{ height: `${height}%` }}
                          title={`${h.hour}시: ${h.count}개`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <p className="text-red-500 text-sm">데이터를 불러올 수 없습니다.</p>
            )}
          </div>

          {/* 저장소 관리 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">저장소 관리</h2>
            {storage ? (
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  {Object.entries(storage.tables).map(([name, data]) => (
                    <div key={name} className="flex justify-between">
                      <span className="text-gray-600">{name}:</span>
                      <span>{data.count.toLocaleString()}개 ({data.estimatedMB}MB)</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span>사용량:</span>
                    <span>{storage.total.estimatedMB}MB / {storage.total.limitMB}MB ({storage.total.usagePercent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${storage.total.usagePercent > 80 ? 'bg-red-500' : storage.total.usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(storage.total.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    정리 대상: {storage.cleanup.oldBusLocationCount.toLocaleString()}개 (6시간+)
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={cleanupHours}
                      onChange={(e) => setCleanupHours(parseInt(e.target.value) || 6)}
                      min={1}
                      max={48}
                      className="w-20 p-2 border rounded"
                    />
                    <span className="text-sm">시간 이상</span>
                    <button
                      onClick={handleCleanup}
                      disabled={loading}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      정리 실행
                    </button>
                  </div>
                  {cleanupResult && (
                    <p className="mt-2 text-sm text-green-600">{cleanupResult}</p>
                  )}
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    BusStopSeats: {storage.tables.BusStopSeats?.count.toLocaleString() ?? 0}개 ({storage.tables.BusStopSeats?.estimatedMB.toFixed(1) ?? 0}MB)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetSeats}
                      disabled={loading}
                      className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50 text-sm"
                    >
                      BusStopSeats 초기화
                    </button>
                    <button
                      onClick={handleResetAll}
                      disabled={loading}
                      className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-black disabled:opacity-50 text-sm"
                    >
                      전체 초기화
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">BusStopSeats: 통계만 초기화 / 전체: 모든 테이블 초기화 (노선·정류장 재수집 필요)</p>
                </div>
              </div>
            ) : loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <p className="text-red-500 text-sm">데이터를 불러올 수 없습니다.</p>
            )}
          </div>

          {/* 통계 커버리지 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">통계 커버리지</h2>
            {coverage ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">통계 있는 노선:</span>
                  <span>{coverage.routesWithStats} / {coverage.totalRoutes} ({coverage.coveragePercent}%)</span>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">노선별 커버리지 (상위 10)</p>
                  <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                    {(coverage.routeCoverage ?? []).slice(0, 10).map((r) => (
                      <div key={r.busRouteId} className="flex justify-between">
                        <span className="truncate">{r.routeName}</span>
                        <span>{r.coveragePercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {(coverage.lowSampleRoutes ?? []).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">샘플 부족 노선 (평균 &lt;10)</p>
                    <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                      {coverage.lowSampleRoutes.map((r) => (
                        <div key={r.busRouteId} className="flex justify-between text-orange-600">
                          <span className="truncate">{r.routeName}</span>
                          <span>{r.avgSamples.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <p className="text-red-500 text-sm">커버리지 데이터를 불러올 수 없습니다.</p>
            )}
          </div>

          {/* 로그 조회 */}
          <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">로그 조회</h2>
            
            <div className="flex gap-4 mb-4">
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">모든 레벨</option>
                <option value="error">ERROR</option>
                <option value="warn">WARN</option>
                <option value="info">INFO</option>
                <option value="debug">DEBUG</option>
              </select>
              
              <input
                type="text"
                value={logKeyword}
                onChange={(e) => setLogKeyword(e.target.value)}
                placeholder="키워드 검색"
                className="p-2 border rounded flex-1"
              />
              
              <button
                onClick={loadAllData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                검색
              </button>
            </div>
            
            {logs ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  파일: {logs.currentFile} | 전체: {logs.totalLines}줄 | 필터: {logs.filteredCount}줄
                </p>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
                  {logs.logs.length > 0 ? (
                    logs.logs.map((log, i) => (
                      <div key={i} className={`py-1 ${
                        log.level === 'ERROR' ? 'text-red-400' :
                        log.level === 'WARN' ? 'text-yellow-400' :
                        log.level === 'DEBUG' ? 'text-gray-400' :
                        'text-gray-100'
                      }`}>
                        <span className="text-gray-500">{log.timestamp}</span>
                        {' '}
                        <span className={`px-1 rounded ${
                          log.level === 'ERROR' ? 'bg-red-900' :
                          log.level === 'WARN' ? 'bg-yellow-900' :
                          log.level === 'DEBUG' ? 'bg-gray-700' :
                          'bg-blue-900'
                        }`}>{log.level}</span>
                        {' '}
                        {log.message}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">로그가 없습니다.</p>
                  )}
                </div>
              </div>
            ) : loading ? (
              <p className="text-gray-500">로딩 중...</p>
            ) : (
              <p className="text-red-500 text-sm">데이터를 불러올 수 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
