'use client';

import { useState } from 'react';

interface DebugResult {
  action: string;
  routeId: string | null;
  keyword: string | null;
  result: unknown[];
  error: string | null;
  executionTime: string;
  timestamp: string;
}

export default function ApiDebugPage() {
  const [action, setAction] = useState<string>('routes');
  const [routeId, setRouteId] = useState<string>('100100114');
  const [keyword, setKeyword] = useState<string>('3201');
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // URL 파라미터 구성
      const params = new URLSearchParams();
      params.append('action', action);
      
      if (action === 'routes') {
        params.append('keyword', keyword);
      } else {
        params.append('routeId', routeId);
      }
      
      // API 호출
      const response = await fetch(`/api/debug-api?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('API 응답:', data);
      setResult(data);
    } catch (err) {
      console.error('API 테스트 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API 디버깅 페이지</h1>
      
      <div className="mb-6 p-4 border rounded bg-gray-50">
        <div className="mb-4">
          <label htmlFor="api-action" className="block mb-2">테스트할 API:</label>
          <select
            id="api-action"
            className="w-full p-2 border rounded"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="테스트할 API 선택"
          >
            <option value="routes">버스 노선 정보 조회</option>
            <option value="locations">버스 위치 및 좌석 정보 조회</option>
            <option value="stations">버스 정류장 정보 조회</option>
          </select>
        </div>
        
        {action === 'routes' ? (
          <div className="mb-4">
            <label htmlFor="bus-keyword" className="block mb-2">버스 번호:</label>
            <input
              id="bus-keyword"
              type="text"
              className="w-full p-2 border rounded"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="버스 번호 입력 (예: 3201)"
            />
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="route-id" className="block mb-2">노선 ID:</label>
            <input
              id="route-id"
              type="text"
              className="w-full p-2 border rounded"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              placeholder="노선 ID 입력 (예: 100100114)"
            />
          </div>
        )}
        
        <button
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleTest}
          disabled={loading}
        >
          {loading ? '테스트 중...' : 'API 테스트'}
        </button>
      </div>
      
      {loading && (
        <div className="text-center p-4">
          <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full"></div>
          <p className="mt-2">API 요청 처리 중...</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-800 rounded">
          <h2 className="text-lg font-semibold mb-2">오류 발생</h2>
          <p>{error}</p>
        </div>
      )}
      
      {result && !loading && (
        <div className="border rounded bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">API 응답 결과</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">액션</p>
              <p className="font-medium">{result.action}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">실행 시간</p>
              <p className="font-medium">{result.executionTime}</p>
            </div>
            {result.routeId && (
              <div>
                <p className="text-sm text-gray-500">노선 ID</p>
                <p className="font-medium">{result.routeId}</p>
              </div>
            )}
            {result.keyword && (
              <div>
                <p className="text-sm text-gray-500">검색어</p>
                <p className="font-medium">{result.keyword}</p>
              </div>
            )}
          </div>
          
          {result.error ? (
            <div className="mb-4 p-4 border border-red-300 bg-red-50 text-red-800 rounded">
              <p className="font-semibold">API 오류:</p>
              <p>{result.error}</p>
            </div>
          ) : (
            <div>
              <h3 className="text-md font-semibold mt-4 mb-2">데이터 ({result.result?.length || 0}개 항목)</h3>
              <div className="overflow-x-auto">
                <pre className="bg-gray-50 p-4 rounded text-sm">
                  {JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            요청 시간: {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
      
      <div className="mt-8 border-t pt-4">
        <h2 className="text-xl font-bold mb-2">디버깅 방법</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>위에서 API를 테스트하면 개발자 도구 콘솔에 로그가 출력됩니다.</li>
          <li>브라우저 개발자 도구(F12)를 열어 Network 탭에서 API 호출 확인 가능</li>
          <li>서버 콘솔에서도 로그가 표시됩니다.</li>
          <li>
            VS Code 디버깅을 사용하려면:
            <ul className="list-disc pl-5 mt-1">
              <li>VS Code에서 F5 키를 누릅니다.</li>
              <li>lib/api/publicDataApi.ts 파일에 중단점 설정</li>
              <li>이 페이지에서 API 테스트 버튼을 클릭하면 중단점에서 실행이 중단됩니다.</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
} 