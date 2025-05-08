/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosResponse } from 'axios';
import { 
  BusRouteList, 
  BusLocation, 
  BusStation,
  BusArrivals,
  BusRouteInfo,
  BusArrival,
  BusBaseInfo,
  BusStationInfo,
  HolidayItem,
  HolidayApiResponse
} from './types';

// 공공데이터포털 API 기본 설정
// 인코딩된 키를 먼저 사용, 없으면 디코딩된 키 사용
const PUBLIC_DATA_API_KEY = process.env.PUBLIC_DATA_API_KEY || process.env.PUBLIC_DATA_BUS_API_KEY_DEC;
const BASE_URL = 'http://apis.data.go.kr/6410000';

// 디버그 모드인지 확인
const DEBUG = !!process.env.DEBUG;

// API 요청 타입별 엔드포인트
const API_ENDPOINTS = {
  BUS_ROUTES: '/busrouteservice/v2/getBusRouteListv2', // 버스 노선 목록
  ROUTE_INFO: '/busrouteservice/v2/getBusRouteInfoItemv2', // 노선 상세 정보
  BUS_LOCATION: '/buslocationservice/v2/getBusLocationListv2', // 버스 위치 정보
  STATIONS: '/busrouteservice/v2/getBusRouteStationListv2', // 경유 정류장 목록
  BUS_STATION_INFO: '/busstationservice/v2/busStationInfov2', // 정류장 상세 정보
  ARRIVALS: '/busarrivalservice/v2/getBusArrivalListv2', // 버스 도착 목록 정보
  BUS_ARRIVAL: '/busarrivalservice/v2/getBusArrivalItemv2', // 버스 도착 목록 정보
  BUS_BASE_INFO: '/baseinfoservice/v2/getBaseInfoItemv2', // 버스 기본 정보
};

const HOLLYDAY_INFO_ENDPOINT = 'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

// 좌석버스 타입코드 (잔여석 정보를 제공하는 버스 유형)
const SEAT_BUS_TYPE_CODES = [11, 12, 14, 16, 17, 21, 22]; // 좌석버스 타입 코드

// 디버그 로그
const logApiRequest = (endpoint: string, params: Record<string, unknown>) => {
  if (DEBUG) {
    console.log(`[API 호출] ${endpoint} 파라미터:`, params);
  }
};

// API 응답 처리
const handleApiResponse = <T>(response: AxiosResponse<any>, endpoint: string): T[] | null => {
  console.log(`[DEBUG] API 응답 처리 (${endpoint})`);
  
  const apiResponse = response.data;
  
  // 응답 구조 로깅
  console.log(`[DEBUG] 응답 구조:`, JSON.stringify(apiResponse, null, 2));
  
  // 응답 구조가 없는 경우
  if (!apiResponse) {
    console.log(`[DEBUG] 응답이 없음`);
    return null;
  }
  
  // 두 가지 가능한 응답 구조 체크 (기존 msgBody vs 정의된 response.body)
  if (apiResponse.msgBody) {
    // 기존 응답 구조 (msgBody)
    console.log(`[DEBUG] msgBody 형태의 응답`);
    
    // 결과 코드 확인
    const resultCode = apiResponse.comMsgHeader?.returnCode || '';
    console.log(`[DEBUG] 응답 코드: ${resultCode}`);
    
    if (resultCode !== '0' && resultCode !== '00' && resultCode !== 0) {
      console.log(`[DEBUG] 에러 메시지: ${apiResponse.comMsgHeader?.errMsg || '알 수 없는 오류'}`);
      return null;
    }
    
    // 아이템 리스트 추출
    const itemList = extractItemList<T>(apiResponse.msgBody);
    console.log(`[DEBUG] 추출된 아이템 수: ${itemList?.length || 0}`);
    
    return itemList;
  } else if (apiResponse.response.msgBody) {
    // 기존 응답 구조 (msgBody)
    console.log(`[DEBUG] msgBody 형태의 응답`);
    
    // 결과 코드 확인
    const resultCode = apiResponse.response.msgHeader?.resultCode;
    console.log(`[DEBUG] 응답 코드: ${resultCode}`);
    
    if (resultCode !== '0' && resultCode !== '00' && resultCode !== 0) {
      console.log(`[DEBUG] 에러 메시지: ${apiResponse.response.msgHeader?.resultMessage || '알 수 없는 오류'}`);
      return null;
    }
    
    // 아이템 리스트 추출
    const itemList = extractItemList<T>(apiResponse.response.msgBody);
    console.log(`[DEBUG] 추출된 아이템 수: ${itemList?.length || 0}`);
    
    return itemList;
  } else if (apiResponse.response) {
    // 새로운 응답 구조 (response.body)
    console.log(`[DEBUG] response.body 형태의 응답`);
    
    // 결과 코드 확인
    const resultCode = apiResponse.response.msgHeader?.resultCode;
    console.log(`[DEBUG] 응답 코드: ${resultCode}`);
    
    if (resultCode !== '0' && resultCode !== '00' && resultCode !== 0) {
      console.log(`[DEBUG] 에러 메시지: ${apiResponse.response.msgHeader?.resultMessage || '알 수 없는 오류'}`);
      return null;
    }
    
    // items 구조 확인
    if (!apiResponse.response.msgBody?.items) {
      console.log(`[DEBUG] 응답 body.items가 없음`);
      return null;
    }
    
    // items.item이 배열인지 확인
    const item = apiResponse.response.msgBody.items.item;
    if (Array.isArray(item)) {
      console.log(`[DEBUG] item은 배열, 길이: ${item.length}`);
      return item as unknown as T[];
    } else if (item) {
      console.log(`[DEBUG] item은 단일 객체`);
      return [item] as unknown as T[];
    }
    
    console.log(`[DEBUG] item 데이터가 없음`);
    return null;
  }
  
  // 둘 다 해당되지 않는 경우
  console.log(`[DEBUG] 알 수 없는 응답 구조`);
  console.log(apiResponse);
  return null;
};

// 아이템 리스트 추출 함수
function extractItemList<T>(msgBody: any): T[] | null {
  console.log('[DEBUG] 아이템 리스트 추출 시작');
  console.log('[DEBUG] msgBody 구조:', JSON.stringify(msgBody, null, 2));
  
  if (!msgBody) return null;
  
  // 아이템 리스트 필드 찾기 (itemList 또는 items 또는 특정 객체)
  const itemsField = Object.keys(msgBody).find(key => 
    key.toLowerCase().includes('item') || 
    (Array.isArray(msgBody[key]) && msgBody[key].length > 0)
  );
  
  if (!itemsField) {
    console.log('[DEBUG] 일반적인 아이템 리스트 필드 없음, 다른 필드 확인');
    // itemList/items 필드가 없으면 busStationInfo와 같은 다른 특정 필드 검색
    for (const key of Object.keys(msgBody)) {
      if (typeof msgBody[key] === 'object' && msgBody[key] !== null) {
        console.log(`[DEBUG] 대체 필드 발견: ${key}`);
        return [msgBody[key]] as T[];
      }
    }
    
    // 대체 필드도 없으면 msgBody 자체가 단일 객체인지 확인
    if (typeof msgBody === 'object' && !Array.isArray(msgBody) && Object.keys(msgBody).length > 0) {
      console.log('[DEBUG] msgBody 자체를 단일 아이템으로 사용');
      return [msgBody] as T[];
    }
    
    console.log('[DEBUG] 아이템 데이터를 찾을 수 없음');
    return null;
  }
  
  console.log(`[DEBUG] 발견된 아이템 리스트 필드: ${itemsField}`);
  
  const items = msgBody[itemsField];
  
  // 단일 아이템인 경우 배열로 변환
  if (items && !Array.isArray(items)) {
    console.log('[DEBUG] 단일 아이템을 배열로 변환');
    return [items] as T[];
  }
  
  return items as T[] || null;
}

// API 호출 함수
async function callApi<T>(endpoint: string, params: Record<string, unknown>): Promise<T[] | null> {
  try {
    console.log(`[DEBUG] API 호출: ${endpoint}`);
    console.log(`[DEBUG] 파라미터:`, JSON.stringify(params, null, 2));
    
    logApiRequest(endpoint, params);
    
    const fullUrl = `${BASE_URL}${endpoint}`;
    console.log(`[DEBUG] 전체 URL 기본: ${fullUrl}`);
    
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: {
        serviceKey: PUBLIC_DATA_API_KEY,
        format: 'json',
        ...params,
      },
      timeout: 10000, // 10초 타임아웃
    });
    
    console.log(`[DEBUG] API 응답 상태: ${response.status}`);
    
    // 응답 데이터가 너무 크면 일부만 로깅
    const responseLog = JSON.stringify(response.data).length > 10000 
      ? `[데이터 크기 큼... 일부만 표시]: ${JSON.stringify(response.data).substring(0, 3000)}...`
      : JSON.stringify(response.data, null, 2);
    console.log(`[DEBUG] API 응답 데이터:`, responseLog);
    
    return handleApiResponse<T>(response, endpoint);
  } catch (error) {
    console.error(`[DEBUG] API 호출 오류 (${endpoint}):`, error);
    
    if (axios.isAxiosError(error)) {
      console.error(`[상세 에러 정보] 상태 코드: ${error.response?.status}`);
      console.error(`[상세 에러 정보] 에러 메시지: ${error.message}`);
      console.error(`[상세 에러 정보] 응답 데이터:`, error.response?.data);
    }
    
    throw error;
  }
}

// 1. 버스 노선 검색 (좌석버스만 필터링)
export async function fetchBusRoutes(keyword: string = ''): Promise<BusRouteList[]> {
  try {
    const routes = await callApi<BusRouteList>(API_ENDPOINTS.BUS_ROUTES, { keyword });
    
    if (!routes) return [];
    
    // 좌석버스만 필터링 (routeTypeCd가 SEAT_BUS_TYPE_CODES에 있는 것만)
    return routes.filter(route => 
      SEAT_BUS_TYPE_CODES.includes(Number(route.routeTypeCd))
    );
  } catch (error) {
    console.error('버스 노선 정보 조회 에러:', error);
    return [];
  }
}

// 2. 노선 상세 정보 조회
export async function fetchRouteDetail(routeId: string): Promise<BusRouteInfo | null> {
  try {
    const routeInfo = await callApi<BusRouteInfo>(API_ENDPOINTS.ROUTE_INFO, { routeId });
    
    if (!routeInfo || routeInfo.length === 0) return null;
    
    // 좌석버스가 아니면 null 반환
    const route = routeInfo[0];
    if (!SEAT_BUS_TYPE_CODES.includes(Number(route.routeTypeCd))) {
      console.log('좌석버스가 아닌 노선:', routeId, route.routeTypeName);
      return null;
    }
    
    return route;
  } catch (error) {
    console.error('노선 상세 정보 조회 에러:', error);
    return null;
  }
}

// 3. 노선의 정류장 목록 조회
export async function fetchRouteStations(routeId: string): Promise<BusStation[]> {
  try {
    const stations = await callApi<BusStation>(API_ENDPOINTS.STATIONS, { routeId });
    return stations || [];
  } catch (error) {
    console.error('노선 정류장 정보 조회 에러:', error);
    return [];
  }
}

// 4. 버스 위치 및 좌석 정보 조회
export async function fetchBusLocationAndSeats(routeId: string): Promise<BusLocation[]> {
  try {
    const locations = await callApi<BusLocation>(API_ENDPOINTS.BUS_LOCATION, { routeId });
    
    if (!locations) return [];
    
    // remainSeatCnt(잔여석)이 있는 데이터만 필터링
    return locations.filter(location => 
      location.remainSeatCnt !== undefined
    );
  } catch (error) {
    console.error('버스 위치 정보 조회 에러:', error);
    return [];
  }
}

// 5. 특정 정류장의 버스 도착 정보 조회 (좌석버스만)
export async function fetchStationArrivals(stationId: string): Promise<BusArrivals[]> {
  try {
    const arrivals = await callApi<BusArrivals>(API_ENDPOINTS.ARRIVALS, { stationId });
    
    if (!arrivals) return [];
    
    // 좌석버스만 필터링
    return arrivals.filter(arrival => 
      SEAT_BUS_TYPE_CODES.includes(Number(arrival.routeTypeCd))
    );
  } catch (error) {
    console.error('정류장 도착 정보 조회 에러:', error);
    return [];
  }
} 

// 6. 특정 정류장의 특정 버스 도착 정보 조회 (좌석버스만)
export async function fetchStationBusArrival(stationId: string, routeId: string, staOrder: string): Promise<BusArrival[]> {
  try {
    const arrivals = await callApi<BusArrival>(API_ENDPOINTS.ARRIVALS, { stationId, routeId, staOrder });
    
    if (!arrivals) return [];
    
    // 좌석버스만 필터링
    return arrivals.filter(arrival => 
      SEAT_BUS_TYPE_CODES.includes(Number(arrival.routeTypeCd))
    );
  } catch (error) {
    console.error('정류장 도착 정보 조회 에러:', error);
    return [];
  }
} 

export async function fetchBusBaseInfo(): Promise<BusBaseInfo[]> {
  try {
    const baseInfo = await callApi<BusBaseInfo>(API_ENDPOINTS.BUS_BASE_INFO, {});
    return baseInfo || [];
  } catch (error) {
    console.error('버스 기본 정보 조회 에러:', error);
    return [];
  }
}

export async function fetchBusStationInfo(stationId: string): Promise<BusStationInfo[]> {
  try {
    const stationInfo = await callApi<BusStationInfo>(API_ENDPOINTS.BUS_STATION_INFO, { stationId });
    return stationInfo || [];
  } catch (error) {
    console.error('정류장 상세 정보 조회 에러:', error);
    return [];
  }
}

// 7. 공휴일 정보 조회
export async function fetchHollydayInfo(year: number, month: number): Promise<HolidayItem[]> {
  try {
    const params = {
      serviceKey: PUBLIC_DATA_API_KEY, // 기존 API 키 사용
      solYear: year,
      solMonth: String(month).padStart(2, '0'), // 월을 2자리로 (예: 9 -> '09')
      _type: 'json', // JSON 형식으로 응답 요청
    };

    console.log('[DEBUG] 공휴일 API 호출 파라미터:', params);

    const response = await axios.get<HolidayApiResponse>(HOLLYDAY_INFO_ENDPOINT, {
      params,
      timeout: 10000, // 10초 타임아웃
    });

    console.log('[DEBUG] 공휴일 API 응답 상태:', response.status);
    console.log('[DEBUG] 공휴일 API 응답 데이터:', JSON.stringify(response.data, null, 2));

    // 응답 코드 확인
    if (response.data?.response?.header?.resultCode === '00') {
      const items = response.data.response.body?.items?.item;
      if (items) {
        // item이 단일 객체일 경우 배열로 변환
        return Array.isArray(items) ? items : [items];
      }
      console.log('[DEBUG] 공휴일 정보 items 없음');
      return []; // 아이템 없으면 빈 배열 반환
    } else {
      console.error('공휴일 정보 조회 API 오류:', response.data?.response?.header?.resultMsg || '알 수 없는 오류');
      return []; // API 오류 시 빈 배열 반환
    }
  } catch (error) {
    console.error('공휴일 정보 API 호출 중 예외 발생:', error);
    // Axios 에러 상세 로깅
    if (axios.isAxiosError(error)) {
      console.error(`[상세 에러 정보] 상태 코드: ${error.response?.status}`);
      console.error(`[상세 에러 정보] 에러 메시지: ${error.message}`);
      console.error(`[상세 에러 정보] 응답 데이터:`, error.response?.data);
    }
    return []; // 예외 발생 시 빈 배열 반환
  }
}

