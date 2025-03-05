/**
 * 공공데이터포털 API 응답 타입 정의
 */

// 공통 응답 구조
export interface ApiResponse<T> {
  response: {
    msgHeader: {
      resultCode: string | number;
      resultMessage: string;
    };
    body: {
      items: {
        item: T | T[];
      };
    };
  };
}

// 버스 노선 정보
export interface BusRouteList {
  busRouteList: string; //	문자열	노선번호목록
  startStationName: string; //	문자열	기점정류소명
  adminName: string; //	문자열	인면허기관명
  districtCd: number; //	정수	관할지역코드 (1:서울,2:경기,3:인천)
  endStationId: number; //	정수	종점정류소아이디
  endStationName: string; //	문자열	종점정류소명
  regionName: string; //	문자열	운행지역
  routeId: number; //	정수	노선아이디
  routeName: string; //	문자열	노선번호
  routeTypeCd: number; //	정수	노선유형코드 (11: 직행좌석형시내버스, 12:좌석형시내버스, 13:일반형시내버스, 14: 광역급행형시내버스, 15: 따복형시내버스, 16: 경기순환버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스, 23:일반형농어촌버스, 30: 마을버스, 41: 고속형시외버스, 42: 좌석형시외버스, 43: 일반형시외버스, 51: 리무진공항버스, 52: 좌석형공항버스, 53: 일반형공항버스)
  routeTypeName: string; //	문자열	노선유형명
  startStationId: number; //	정수	기점정류소아이디
}

export interface BusRouteInfo {
  busRouteInfoItem: string; //	문자열	노선정보항목
  sunPeekAlloc: number; //	정수	일요일 최소 배차시간(분)
  adminName: string; //	문자열	인면허기관명
  companyId: number; //	정수	운수업체아이디
  companyName: string; //	문자열	운수업체명
  companyTel: string; //	문자열	운수업체 전화번호
  districtCd: number; //	정수	관할지역코드 (1:서울,2:경기,3:인천)
  downFirstTime: string; //	문자열	평일 종점 첫차시간
  downLastTime: string; //	문자열	평일 종점 막차시간
  endMobileNo: number; //	정수	종점정류소번호
  endStationId: number; //	정수	종점정류소아이디
  endStationName: string; //	문자열	종점정류소명
  garageName: string; //	문자열	차고지명
  garageTel: string; //	문자열	차고지전화번호
  multiFlag: number; //	정수	공동배차 ( 2개 이상의 운수사가 공동배차하는 노선인지 여부. Y: 공동배차노선임, N: 공동배차노선아님)
  peekAlloc: number; //	정수	평일 최소 배차시간(분)
  regionName: string; //	문자열	운행지역
  routeId: number; //	정수	노선아이디
  routeName: string; //	문자열	노선번호
  routeTypeCd: number; //	정수	노선유형코드 (11: 직행좌석형시내버스, 12:좌석형시내버스, 13:일반형시내버스, 14: 광역급행형시내버스, 15: 따복형시내버스, 16: 경기순환버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스, 23:일반형농어촌버스, 30: 마을버스, 41: 고속형시외버스, 42: 좌석형시외버스, 43: 일반형시외버스, 51: 리무진공항버스, 52: 좌석형공항버스, 53: 일반형공항버스)
  routeTypeName: string; //	문자열	노선유형명
  satDownFirstTime: number; //	정수	토요일 종점 첫차시간
  satDownLastTime: number; //	정수	토요일 종점 막차시간
  satNPeekAlloc: number; //	정수	토요일 최대 배차시간(분)
  satPeekAlloc: number; //	정수	토요일 최소 배차시간(분)
  satUpFirstTime: number; //	정수	토요일 기점 첫차시간
  satUpLastTime: number; //	정수	토요일 기점 막차시간
  startStationId: number; //	정수	기점정류소아이디
  startStationName: string; //	문자열	기점정류소명
  startMobileNo: number; //	정수	기점정류소번호
  sunDownFirstTime: number; //	정수	일요일 종점 첫차시간
  sunDownLastTime: number; //	정수	일요일 종점 막차시간
  sunNPeekAlloc: number; //	정수	일요일 최대 배차시간(분)
  sunUpFirstTime: number; //	정수	일요일 기점 첫차시간
  sunUpLastTime: number; //	정수	일요일 기점 막차시간
  turnStID: number; //	정수	회차정류소아이디
  turnStNm: string; //	문자열	회차정류소명
  upFirstTime: number; //	정수	평일 기점 첫차시간
  upLastTime: number; //	정수	평일 기점 막차시간
  weDownFirstTime: number; //	정수	공휴일 종점 첫차시간
  weDownLastTime: number; //	정수	공휴일 종점 막차시간
  weNPeekAlloc: number; //	정수	공휴일 최대 배차시간(분)
  wePeekAlloc: number; //	정수	공휴일 최소 배차시간(분)
  weUpFirstTime: number; //	정수	공휴일 기점 첫차시간
  weUpLastTime: number; //	정수	공휴일 기점 막차시간
  nPeekAlloc: number; //	정수	평일 최대 배차시간(분)
}

// 버스 정류장 정보
export interface BusStation {
  busRouteStationList: string; //	문자열	정류소목록
  centerYn: string; //	문자열	중앙차로 여부 (N:일반,Y:중앙차로)
  turnYn: string; //	문자열	회차점여부
  districtCd: number; //	정수	노선의 관할지역코드 (1:서울,2:경기,3:인천)
  mobileNo: number; //	정수	정류소번호
  regionName: string; //	문자열	정류소 위치 지역명
  stationId: number; //	정수	정류소아이디
  stationName: string; //	문자열	정류소명
  x: number; //	숫자형	정류소 X좌표
  y: number; //	숫자형	정류소 Y좌표
  adminName: string; //	문자열	정류소 관할기관
  stationSeq: number; //	정수	노선의 정류소순번
  turnSeq: number; //	정수	회차점순번
}

// 버스 위치 정보
export interface BusLocation {
  busLocationList: string; //	문자열	버스위치정보목록
  crowded: string; //	문자열	차내혼잡도 (1:여유, 2:보통, 3:혼잡, 4:매우혼잡) 차내혼잡도 제공노선유형 (13:일반형시내버스, 15:따복형시내버스, 23:일반형농어촌버스)
  lowPlate: number; //	정수	특수차량여부 (0: 일반버스, 1: 저상버스, 2: 2층버스, 5: 전세버스, 6: 예약버스, 7: 트롤리)
  plateNo: string; //	문자열	차량번호
  remainSeatCnt: number; //	정수	차내빈자리수 (-1:정보없음, 0~:빈자리 수) 차내빈자리수 제공노선유형 (11: 직행좌석형시내버스, 12:좌석형시내버스, 14: 광역급행형시내버스, 16: 경기순환버스, 17: 준공영제직행좌석시내버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스)
  routeId: number; //	정수	노선아이디
  routeTypeCd: number; //	정수	노선유형코드 (11: 직행좌석형시내버스, 12:좌석형시내버스, 13:일반형시내버스, 14: 광역급행형시내버스, 15: 따복형시내버스, 16: 경기순환버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스, 23:일반형농어촌버스, 30: 마을버스, 41: 고속형시외버스, 42: 좌석형시외버스, 43: 일반형시외버스, 51: 리무진공항버스, 52: 좌석형공항버스, 53: 일반형공항버스)
  stateCd: number; //	정수	상태코드 (0:교차로통과, 1:정류소 도착, 2:정류소 출발)
  stationId: number; //	정수	정류소아이디
  stationSeq: number; //	정수	정류소순번
  taglessCd: number; //	정수	태그리스 서비스가 제공되는 차량 여부 (0:일반차량, 1:태그리스차량)
  vehId: number; //	정수	차량아이디
}

// 버스 도착 정보
export interface BusArrivals {
  busArrivalList: string; //	문자열	버스도착정보목록
  stateCd1: number; //	정수	첫번째차량 상태코드 (0:교차로통과, 1:정류소 도착, 2:정류소 출발)
  stateCd2: number; //	정수	두번째차량 상태코드 (0:교차로통과, 1:정류소 도착, 2:정류소 출발)
  crowded1: number; //	정수	첫번째차량 차내혼잡도 (1:여유, 2:보통, 3:혼잡, 4:매우혼잡) 차내혼잡도 제공노선유형 (13:일반형시내버스, 15:따복형시내버스, 23:일반형농어촌버스)
  crowded2: number; //	정수	두번째차량 차내혼잡도 (1:여유, 2:보통, 3:혼잡, 4:매우혼잡) 차내혼잡도 제공노선유형 (13:일반형시내버스, 15:따복형시내버스, 23:일반형농어촌버스)
  flag: string; //	문자열	상태구분(RUN:운행중 PASS:운행중 STOP:운행종료 WAIT:회차지대기)
  locationNo1: number; //	정수	첫번째차량 위치 정보 (몇번째전 정류소)
  locationNo2: number; //	정수	두번째차량 위치 정보 (몇번째전 정류소)
  lowPlate1: number; //	정수	첫번째차량 특수차량여부 (0: 일반버스, 1: 저상버스, 2: 2층버스, 5: 전세버스, 6: 예약버스, 7: 트롤리)
  lowPlate2: number; //	정수	두번째차량 특수차량여부 (0: 일반버스, 1: 저상버스, 2: 2층버스, 5: 전세버스, 6: 예약버스, 7: 트롤리)
  plateNo1: string; //	문자열	첫번째차량 차량번호
  plateNo2: string; //	문자열	두번째차량 차량번호
  predictTime1: number; //	정수	첫번째차량 도착예상시간 (몇 분후 도착예정. 분단위)
  predictTime2: number; //	정수	두번째차량 도착예상시간 (몇 분후 도착예정. 분단위)
  remainSeatCnt1: number; //	정수	첫번째 차량 차내빈자리수 (-1:정보없음, 0~:빈자리 수) 차내빈자리수 제공노선유형 (11: 직행좌석형시내버스, 12:좌석형시내버스, 14: 광역급행형시내버스, 16: 경기순환버스, 17: 준공영제직행좌석시내버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스)
  remainSeatCnt2: number; //	정수	두번째 차량 차내빈자리수 (-1:정보없음, 0~:빈자리 수) 차내빈자리수 제공노선유형 (11: 직행좌석형시내버스, 12:좌석형시내버스, 14: 광역급행형시내버스, 16: 경기순환버스, 17: 준공영제직행좌석시내버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스)
  routeDestId: number; //	정수	진행방향 마지막 정류소아이디
  routeDestName: string; //	문자열	진행방향 마지막 정류소명
  routeId: number; //	정수	노선아이디
  routeName: string; //	문자열	노선명
  routeTypeCd: number; //	정수	노선유형코드 (11: 직행좌석형시내버스, 12:좌석형시내버스, 13:일반형시내버스, 14: 광역급행형시내버스, 15: 따복형시내버스, 16: 경기순환버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스, 23:일반형농어촌버스, 30: 마을버스, 41: 고속형시외버스, 42: 좌석형시외버스, 43: 일반형시외버스, 51: 리무진공항버스, 52: 좌석형공항버스, 53: 일반형공항버스)
  staOrder: number; //	정수	정류소순번 (요청변수 정류소가 노선의 몇번째 정류소인지 나타냄)
  stationId: number; //	정수	정류소아이디 (요청변수 정류소 아이디)
  stationNm1: string; //	문자열	첫번째차량 위치 정류소명
  stationNm2: string; //	문자열	두번째차량 위치 정류소명
  taglessCd1: number; //	정수	첫번째 차량 태그리스 서비스 제공여부 (0:일반차량, 1:태그리스차량)
  taglessCd2: number; //	정수	두번째 차량 태그리스 서비스 제공여부 (0:일반차량, 1:태그리스차량)
  turnSeq: number; //	정수	노선의 회차점 순번
  vehId1: number; //	정수	첫번째 차량 차량아이디
  vehId2: number; //	정수	두번째 차량 차량아이디
  predictTimeSec1: number; //	정수	첫번째차량 도착예상시간 (몇 초후 도착예정. 초단위)
  predictTimeSec2: number; //	정수	두번째차량 도착예상시간 (몇 초후 도착예정. 초단위)
} 

export interface BusArrival {
  busArrivalItem: string; //	문자열	버스도착정보항목
  crowded1: number; //	정수	첫번째차량 차내혼잡도 (1:여유, 2:보통, 3:혼잡, 4:매우혼잡) 차내혼잡도 제공노선유형 (13:일반형시내버스, 15:따복형시내버스, 23:일반형농어촌버스)
  crowded2: number; //	정수	두번째차량 차내혼잡도 (1:여유, 2:보통, 3:혼잡, 4:매우혼잡) 차내혼잡도 제공노선유형 (13:일반형시내버스, 15:따복형시내버스, 23:일반형농어촌버스)
  flag: string; //	문자열	상태구분(RUN:운행중 PASS:운행중 STOP:운행종료 WAIT:회차지대기)
  locationNo1: number; //	정수	첫번째차량 위치 정보 (몇번째전 정류소)
  locationNo2: number; //	정수	두번째차량 위치 정보 (몇번째전 정류소)
  lowPlate1: number; //	정수	첫번째차량 특수차량여부 (0: 일반버스, 1: 저상버스, 2: 2층버스, 5: 전세버스, 6: 예약버스, 7: 트롤리)
  lowPlate2: number; //	정수	두번째차량 특수차량여부 (0: 일반버스, 1: 저상버스, 2: 2층버스, 5: 전세버스, 6: 예약버스, 7: 트롤리)
  plateNo1: string; //	문자열	첫번째차량 차량번호
  plateNo2: string; //	문자열	두번째차량 차량번호
  predictTime1: number; //	정수	첫번째차량 도착예상시간 (몇 분후 도착예정. 분단위)
  predictTime2: number; //	정수	두번째차량 도착예상시간 (몇 분후 도착예정. 분단위)
  remainSeatCnt1: number; //	정수	첫번째 차량 차내빈자리수 (-1:정보없음, 0~:빈자리 수) 차내빈자리수 제공노선유형 (11: 직행좌석형시내버스, 12:좌석형시내버스, 14: 광역급행형시내버스, 16: 경기순환버스, 17: 준공영제직행좌석시내버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스)
  remainSeatCnt2: number; //	정수	두번째 차량 차내빈자리수 (-1:정보없음, 0~:빈자리 수) 차내빈자리수 제공노선유형 (11: 직행좌석형시내버스, 12:좌석형시내버스, 14: 광역급행형시내버스, 16: 경기순환버스, 17: 준공영제직행좌석시내버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스)
  routeDestId: number; //	정수	진행방향 마지막 정류소아이디
  routeDestName: string; //	문자열	진행방향 마지막 정류소명
  routeId: number; //	정수	노선아이디
  routeName: string; //	문자열	노선명
  routeTypeCd: number; //	정수	노선유형코드 (11: 직행좌석형시내버스, 12:좌석형시내버스, 13:일반형시내버스, 14: 광역급행형시내버스, 15: 따복형시내버스, 16: 경기순환버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스, 23:일반형농어촌버스, 30: 마을버스, 41: 고속형시외버스, 42: 좌석형시외버스, 43: 일반형시외버스, 51: 리무진공항버스, 52: 좌석형공항버스, 53:
  staOrder: number; //	정수	정류소순번 (요청변수 정류소가 노선의 몇번째 정류소인지 나타냄)
  stationId: number; //	정수	정류소아이디 (요청변수 정류소 아이디)
  stationNm1: string; //	문자열	첫번째차량 위치 정류소명
  stationNm2: string; //	문자열	두번째차량 위치 정류소명
  taglessCd1: number; //	정수	첫번째 차량 태그리스 서비스 제공여부 (0:일반차량, 1:태그리스차량)
  taglessCd2: number; //	정수	두번째 차량 태그리스 서비스 제공여부 (0:일반차량, 1:태그리스차량)
  turnSeq: number; //	정수	노선의 회차점 순번
  vehId1: number; //	정수	첫번째 차량 차량아이디
  vehId2: number; //	정수	두번째 차량 차량아이디
  predictTimeSec1: number; //	정수	첫번째차량 도착예상시간 (몇 초후 도착예정. 초단위)
  predictTimeSec2: number; //	정수	두번째차량 도착예상시간 (몇 초후 도착예정. 초단위)
}

export interface BusBaseInfo {
  baseInfoItem: string; //	문자열	기반정보목록
  areaDownloadUrl: string; //	문자열	운행지역 정보 다운로드 경로
  areaVersion: string; //	문자열	운행지역 정보 버전
  routeDownloadUrl: string; //	문자열	노선정보 다운로드 경로
  routeVersion: string; //	문자열	노선정보 버전
  routeLineDownloadUrl: string; //	문자열	노선경로 다운로드 경로
  routeLineVersion: string; //	문자열	노선경로 버전
  routeStationDownloadUrl: string; //	문자열	노선-정류소정보 다운로드 경로
  routeStationVersion: string; //	문자열	노선-정류소정보 버전
  stationDownloadUrl: string; //	문자열	정류소정보 다운로드 경로
  stationVersion: string; //	문자열	정류소정보 버전
  vehicleDownloadUrl: string; //	문자열	차량정보 다운로드 경로
  vehicleVersion: string; //	문자열	차량정보 버전
}

export interface BueRouteBaseInfo {
  routeId: number; //	노선아이디
  adminName: string; //	인면허기관명
  endStationId: number; //	종점정류소아이디
  endStationName: string; //	종점정류소명
  regionName: string; //	운행지역
  routeName: string; //	노선번호
  routeTypeCd: number; //	노선유형코드 (11: 직행좌석형시내버스, 12: 좌석형시내버스, 13: 일반형시내버스, 14: 광역급행형시내버스, 15: 따복형시내버스, 16: 경기순환버스, 21: 직행좌석형농어촌버스, 22: 좌석형농어촌버스, 23: 일반형농어촌버스, 30: 마을버스, 41: 고속형시외버스, 42: 좌석형시외버스, 43: 일반형시외버스, 51: 리무진공항버스, 52: 좌석형공항버스, 53: 일반형공항버스)
  startStationId: number; //	기점정류소아이디
  startStationName: string; //	기점정류소명
  turnSeq: number; //	회차 정류소 순번
  companyId: number; //	운수업체아이디
  companyName: string; //	운수업체명
  companyTel: string; //	운수업체 전화번호
  upFirstTime: string; //	평일 기점 첫차시간
  upLastTime: string; //	평일 기점 막차시간
  downFirstTime: string; //	평일 종점 첫차시간
  downLastTime: string; //	평일 종점 막차시간
  peekAlloc: number; //	평일 최소 배차시간(분)
  npeekAlloc: number; //	평일 최대 배차시간(분)
  satUpFirstTime: string; //	토요일 기점 첫차시간
  satUpLastTime: string; // 	토요일 기점 막차시간
  satDownFirstTime: string; //	토요일 종점 첫차시간
  satDownLastTime: string; //	토요일 종점 막차시간
  satPeekAlloc: number; //	토요일 최소 배차시간(분)
  satNpeekAlloc: number; //	토요일 최대 배차시간(분)
  sunUpFirstTime: string; //	일요일 기점 첫차시간
  sunUpLastTime: string; //	일요일 기점 막차시간
  sunDownFirstTime: string; //	일요일 종점 첫차시간
  sunDownLastTime: string; //	일요일 종점 막차시간
  sunPeekAlloc: number; //	일요일 최소 배차시간(분)
  sunNpeekAlloc: number; //	일요일 최대 배차시간(분)
  weUpFirstTime: string; //	공휴일 기점 첫차시간
  weUpLastTime: string; //	공휴일 기점 막차시간
  weDownFirstTime: string; //	공휴일 종점 첫차시간
  weDownLastTime: string; //	공휴일 종점 막차시간
  wePeekAlloc: number; //	공휴일 최소 배차시간(분)
  weNpeekAlloc: number; //	공휴일 최대 배차시간(분)
}

export interface BusStationInfo {
  busStationInfo: string; //	문자열	정류소항목
  centerYn: string; //	문자열	중앙차로 여부 (N:일반,Y:중앙차로)
  mobileNo: number; //	정수	정류소번호
  regionName: string; //	문자열	정류소 위치 지역명
  stationId: number; //	정수	정류소아이디
  stationName: string; //	문자열	정류소명
  x: number; //	숫자형	정류소 X좌표
  y: number; //	숫자형	정류소 Y좌표
}
