import axios from 'axios';

// API 키 디버깅용 테스트 함수
export async function testApiKey() {
  const keys = {
    original: process.env.PUBLIC_DATA_API_KEY,
    decoded: process.env.PUBLIC_DATA_BUS_API_KEY_DEC,
    encoded: process.env.PUBLIC_DATA_BUS_API_KEY_INC,
  };
  
  console.log('=== API 키 디버깅 ===');
  console.log('Original:', keys.original);
  console.log('Decoded:', keys.decoded);
  console.log('Encoded:', keys.encoded);
  
  // 각 키로 테스트 시도
  const results = {};
  
  for (const [type, key] of Object.entries(keys)) {
    if (!key) continue;
    
    try {
      // 간단한 API 호출 테스트 (버스 노선 목록 조회)
      const response = await axios.get('http://apis.data.go.kr/6410000/busrouteservice/v2/getBusRouteListv2', {
        params: {
          serviceKey: key,
          keyword: '3201', // 테스트용 키워드
          format: 'json',
        },
        timeout: 5000, // 5초 타임아웃
      });
      
      // 응답 확인
      if (response.data?.response?.msgHeader?.resultCode === 0) {
        results[type] = {
          status: 'SUCCESS',
          code: response.data.response.msgHeader.resultCode,
          message: response.data.response.msgHeader.resultMessage,
        };
      } else {
        results[type] = {
          status: 'ERROR',
          code: response.data.response.msgHeader?.resultCode,
          message: response.data.response.msgHeader?.resultMessage || response.data,
        };
      }
    } catch (error) {
      results[type] = {
        status: 'EXCEPTION',
        message: error.message,
        response: error.response?.data,
      };
    }
  }
  
  console.log('=== API 테스트 결과 ===');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

// API 파라미터 테스트
export async function testApiParams(apiType: string, params: Record<string, any>) {
  const key = process.env.PUBLIC_DATA_BUS_API_KEY_DEC; // DEC 버전 키 사용
  const keyEnc = process.env.PUBLIC_DATA_BUS_API_KEY_INC; // INC 버전 키 사용
  
  // API 엔드포인트 맵
  const endpoints = {
    routes: 'http://apis.data.go.kr/6410000/busrouteservice/v2/getBusRouteListv2',
    routeInfo: 'http://apis.data.go.kr/6410000/busrouteservice/v2/getBusRouteInfoItemv2',
    stations: 'http://apis.data.go.kr/6410000/busrouteservice/v2/getBusRouteStationListv2',
    locations: 'http://apis.data.go.kr/6410000/buslocationservice/v2/getBusLocationListv2',
    arrivals: 'http://apis.data.go.kr/6410000/busarrivalservice/v2/getBusArrivalListv2'
  };
  
  const endpoint = endpoints[apiType];
  if (!endpoint) {
    return { error: `알 수 없는 API 유형: ${apiType}` };
  }
  
  try {
    // 디코딩된 키와 인코딩된 키 모두 시도
    for (const [keyType, serviceKey] of [['decoded', key], ['encoded', keyEnc]]) {
      console.log(`${keyType} 키로 ${apiType} API 테스트 중...`);
      
      const response = await axios.get(endpoint, {
        params: {
          serviceKey,
          format: 'json',
          ...params
        },
        timeout: 5000,
      });
      
      console.log(`${keyType} 키 응답:`, 
        response.data?.response?.msgHeader?.resultCode, 
        response.data?.response?.msgHeader?.resultMessage
      );
      
      if (response.data?.response?.msgHeader?.resultCode === 0) {
        console.log('성공! 테스트 완료');
        return {
          success: true,
          keyType,
          data: response.data
        };
      }
    }
    
    return {
      success: false,
      message: '모든 API 키 시도 실패'
    };
  } catch (error) {
    console.error('API 테스트 예외 발생:', error.message);
    return {
      success: false,
      error: error.message,
      response: error.response?.data
    };
  }
} 