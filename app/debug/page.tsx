'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

// 디버그 상태 타입 정의
interface DebugState {
  environment: {
    nodeEnv: string;
    databaseUrl?: string;
    supabaseUrl?: string;
    publicDataApiKey?: string;
  };
  prisma: {
    connected: boolean;
    version?: string;
    error?: string;
  };
  supabase: {
    connected: boolean;
    version?: string;
    error?: string;
  };
  apiTest?: {
    timestamp: string;
    apiKeys: Record<string, string>;
    searchQuery: string;
    selectedRouteId: string;
    busRoutes: {
      success: boolean;
      count: number;
      data: Array<Record<string, unknown>>;
      error: string | null;
      time: string;
    };
    busStations: {
      success: boolean;
      count: number;
      data: Array<Record<string, unknown>>;
      error: string | null;
      time: string;
    };
    busLocations: {
      success: boolean;
      count: number;
      data: Array<Record<string, unknown>>;
      error: string | null;
      time: string;
    };
  };
}

// API 통신 fetcher
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DebugPage() {
  const [searchRoute, setSearchRoute] = useState('7770');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugState | null>(null);
  
  // 디버그 데이터 로드
  const { data, error: swrError, isLoading: swrLoading } = useSWR('/api/debug', fetcher);
  
  // 데이터 로드 완료 시
  useEffect(() => {
    if (data && !swrLoading) {
      setDebugData(data as DebugState);
    }
    
    if (swrError) {
      setError('디버그 데이터 로드 중 오류 발생');
    }
  }, [data, swrError, swrLoading]);
  
  // API 테스트 함수
  const handleApiTest = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/debug/publicapi?route=${searchRoute}`);
      const apiTestData = await response.json();
      
      if (!response.ok) {
        throw new Error(apiTestData.error || '알 수 없는 오류');
      }
      
      // 성공 시 디버그 데이터 업데이트
      setDebugData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          apiTest: apiTestData
        };
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 개발 환경 여부 확인
  const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  if (!isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-700 max-w-md">
          <h1 className="text-xl font-bold mb-4">프로덕션 환경에서는 디버그 페이지에 접근할 수 없습니다.</h1>
          <p>이 페이지는 로컬 개발 환경에서만 사용할 수 있습니다.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">시스템 디버그 페이지</h1>
        
        {swrLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3">디버그 정보 로드 중...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700 mb-6">
            <h2 className="text-lg font-semibold mb-2">오류 발생</h2>
            <p>{error}</p>
          </div>
        ) : !debugData ? (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-700">
            <p>디버그 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 환경 변수 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">환경 변수</h2>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-500">NODE_ENV</div>
                  <div className="mt-1">{debugData.environment.nodeEnv || '설정되지 않음'}</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-500">DATABASE_URL</div>
                  <div className="mt-1">
                    {debugData.environment.databaseUrl ? 
                      '******' + debugData.environment.databaseUrl.substring(debugData.environment.databaseUrl.length - 10) : 
                      '설정되지 않음'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-500">SUPABASE_URL</div>
                  <div className="mt-1">
                    {debugData.environment.supabaseUrl ? '설정됨' : '설정되지 않음'}
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-500">PUBLIC_DATA_API_KEY</div>
                  <div className="mt-1">
                    {debugData.environment.publicDataApiKey ? '설정됨' : '설정되지 않음'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Prisma 상태 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Prisma 데이터베이스 연결</h2>
              <div className="flex items-center mb-4">
                <div className={`w-3 h-3 rounded-full mr-2 ${debugData.prisma.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{debugData.prisma.connected ? '연결됨' : '연결 안됨'}</span>
              </div>
              
              {debugData.prisma.version && (
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-500">Prisma 버전</div>
                  <div className="mt-1">{debugData.prisma.version}</div>
                </div>
              )}
              
              {debugData.prisma.error && (
                <div className="mt-4 p-3 bg-red-50 rounded border border-red-100">
                  <div className="text-sm font-medium text-red-700">오류 메시지</div>
                  <div className="mt-1 text-red-600">{debugData.prisma.error}</div>
                </div>
              )}
            </div>
            
            {/* Supabase 상태 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Supabase 연결</h2>
              <div className="flex items-center mb-4">
                <div className={`w-3 h-3 rounded-full mr-2 ${debugData.supabase.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{debugData.supabase.connected ? '연결됨' : '연결 안됨'}</span>
              </div>
              
              {debugData.supabase.version && (
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-500">Supabase 버전</div>
                  <div className="mt-1">{debugData.supabase.version}</div>
                </div>
              )}
              
              {debugData.supabase.error && (
                <div className="mt-4 p-3 bg-red-50 rounded border border-red-100">
                  <div className="text-sm font-medium text-red-700">오류 메시지</div>
                  <div className="mt-1 text-red-600">{debugData.supabase.error}</div>
                </div>
              )}
            </div>
            
            {/* 공공 데이터 API 테스트 섹션 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">공공 데이터 API 테스트</h2>
              
              <div className="mb-6">
                <label htmlFor="route" className="block text-sm font-medium text-gray-700 mb-1">
                  버스 노선 번호
                </label>
                <div className="flex">
                  <input
                    type="text"
                    id="route"
                    value={searchRoute}
                    onChange={(e) => setSearchRoute(e.target.value)}
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 7770"
                  />
                  <button
                    onClick={handleApiTest}
                    disabled={isLoading}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isLoading ? 'API 테스트 중...' : 'API 테스트'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  버스 노선 번호를 입력하고 API 테스트 버튼을 클릭하세요.
                </p>
              </div>
              
              {/* API 테스트 결과 표시 */}
              {debugData.apiTest && (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded">
                    <h3 className="font-medium mb-2">API 키 정보</h3>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {Object.entries(debugData.apiTest.apiKeys).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium mr-2">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">버스 노선 조회 결과</h3>
                    <div className={`p-4 rounded ${debugData.apiTest.busRoutes.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">성공 여부: {debugData.apiTest.busRoutes.success ? '성공' : '실패'}</span>
                        <span>처리 시간: {debugData.apiTest.busRoutes.time}</span>
                      </div>
                      
                      {debugData.apiTest.busRoutes.error ? (
                        <div className="text-red-600">오류: {debugData.apiTest.busRoutes.error}</div>
                      ) : (
                        <>
                          <div className="mb-2">노선 수: {debugData.apiTest.busRoutes.count}</div>
                          <div className="max-h-40 overflow-auto">
                            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(debugData.apiTest.busRoutes.data, null, 2)}</pre>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {debugData.apiTest.busRoutes.success && debugData.apiTest.selectedRouteId && (
                      <>
                        <h3 className="font-medium mt-4">버스 정류장 조회 결과</h3>
                        <div className={`p-4 rounded ${debugData.apiTest.busStations.success ? 'bg-green-50' : 'bg-red-50'}`}>
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">성공 여부: {debugData.apiTest.busStations.success ? '성공' : '실패'}</span>
                            <span>처리 시간: {debugData.apiTest.busStations.time}</span>
                          </div>
                          
                          {debugData.apiTest.busStations.error ? (
                            <div className="text-red-600">오류: {debugData.apiTest.busStations.error}</div>
                          ) : (
                            <>
                              <div className="mb-2">정류장 수: {debugData.apiTest.busStations.count}</div>
                              <div className="max-h-40 overflow-auto">
                                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(debugData.apiTest.busStations.data, null, 2)}</pre>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <h3 className="font-medium mt-4">버스 위치 및 좌석 조회 결과</h3>
                        <div className={`p-4 rounded ${debugData.apiTest.busLocations.success ? 'bg-green-50' : 'bg-red-50'}`}>
                          <div className="flex justify-between mb-2">
                            <span className="font-medium">성공 여부: {debugData.apiTest.busLocations.success ? '성공' : '실패'}</span>
                            <span>처리 시간: {debugData.apiTest.busLocations.time}</span>
                          </div>
                          
                          {debugData.apiTest.busLocations.error ? (
                            <div className="text-red-600">오류: {debugData.apiTest.busLocations.error}</div>
                          ) : (
                            <>
                              <div className="mb-2">버스 수: {debugData.apiTest.busLocations.count}</div>
                              <div className="max-h-40 overflow-auto">
                                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(debugData.apiTest.busLocations.data, null, 2)}</pre>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 