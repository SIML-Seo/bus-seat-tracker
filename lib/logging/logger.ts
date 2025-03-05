import fs from 'fs';
import path from 'path';
import { getSupabaseAdmin } from '../supabase/client';

// 로깅 레벨 타입
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 로그 매니저 클래스
export class LogManager {
  private logBuffer: string[] = [];
  private currentDate: string;
  private logFileName: string;
  private readonly bucketName = 'bus-logs';
  private readonly maxBufferSize = 100; // 버퍼 최대 크기
  private readonly localLogDir: string;
  private bufferTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 60 * 1000; // 1분마다 강제 저장
  
  constructor() {
    this.currentDate = this.getFormattedDate();
    this.logFileName = `log_${this.currentDate}.txt`;
    this.localLogDir = path.join(process.cwd(), 'logs');
    
    // 로컬 로그 디렉토리 생성
    if (!fs.existsSync(this.localLogDir)) {
      fs.mkdirSync(this.localLogDir, { recursive: true });
    }
    
    // 정기적으로 로그 저장
    this.bufferTimer = setInterval(() => {
      this.flushLogs().catch(err => {
        console.error('로그 자동 저장 실패:', err);
      });
    }, this.flushInterval);
  }
  
  // 날짜 포맷팅 (YYYY-MM-DD)
  private getFormattedDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  // 타임스탬프 포맷팅
  private getTimestamp(): string {
    const now = new Date();
    
    // 날짜 포맷터
    const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Seoul'
    });
  
    // 포맷팅된 부분들을 가져옴
    const parts = dateFormatter.formatToParts(now);
    
    // 필요한 부분을 객체로 변환
    const formatted = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);
    
    // YYYY-MM-DD HH:MM:SS 형식으로 조합
    return `${formatted.year}-${formatted.month}-${formatted.day} ${formatted.hour}:${formatted.minute}:${formatted.second}`;
  }
  
  // 로그 추가
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async log(message: string, ...args: any[]): Promise<void> {
    // 날짜가 바뀌었는지 확인
    const currentDate = this.getFormattedDate();
    if (currentDate !== this.currentDate) {
      await this.flushLogs(); // 이전 날짜의 로그 저장
      this.currentDate = currentDate;
      this.logFileName = `log_${this.currentDate}.txt`;
    }
    
    // 추가 인자가 있으면 결합
    let combinedMessage = message;
    if (args.length > 0) {
      combinedMessage = args.reduce((msg, arg) => {
        // 에러 객체 처리
        if (arg instanceof Error) {
          return `${msg} ${arg.message}\n${arg.stack}`;
        }
        // 객체 처리
        else if (typeof arg === 'object' && arg !== null) {
          try {
            return `${msg} ${JSON.stringify(arg)}`;
          } catch {
            return `${msg} [Object]`;
          }
        }
        return `${msg} ${arg}`;
      }, message);
    }
    
    // 로그 메시지 포맷팅
    const formattedMessage = `[${this.getTimestamp()}] [INFO] ${combinedMessage}`;
    
    // 콘솔에 출력 (기존 console.log 대체)
    console.log(formattedMessage);
    
    // 버퍼에 추가
    this.logBuffer.push(formattedMessage);
    
    // 버퍼 크기가 최대치에 도달하면 저장
    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flushLogs();
    }
  }
  
  // 편의 메서드들
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async debug(message: string, ...args: any[]): Promise<void> {
    // 추가 인자가 있으면 결합
    let combinedMessage = message;
    if (args.length > 0) {
      combinedMessage = args.reduce((msg, arg) => {
        // 에러 객체 처리
        if (arg instanceof Error) {
          return `${msg} ${arg.message}\n${arg.stack}`;
        }
        // 객체 처리
        else if (typeof arg === 'object' && arg !== null) {
          try {
            return `${msg} ${JSON.stringify(arg)}`;
          } catch {
            return `${msg} [Object]`;
          }
        }
        return `${msg} ${arg}`;
      }, message);
    }
    
    // 로그 메시지 포맷팅
    const formattedMessage = `[${this.getTimestamp()}] [DEBUG] ${combinedMessage}`;
    
    // 콘솔에 출력
    console.debug(formattedMessage);
    
    // 버퍼에 추가
    this.logBuffer.push(formattedMessage);
    
    // 버퍼 크기가 최대치에 도달하면 저장
    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flushLogs();
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async info(message: string, ...args: any[]): Promise<void> {
    return this.log(message, ...args);
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async warn(message: string, ...args: any[]): Promise<void> {
    // 추가 인자가 있으면 결합
    let combinedMessage = message;
    if (args.length > 0) {
      combinedMessage = args.reduce((msg, arg) => {
        // 에러 객체 처리
        if (arg instanceof Error) {
          return `${msg} ${arg.message}\n${arg.stack}`;
        }
        // 객체 처리
        else if (typeof arg === 'object' && arg !== null) {
          try {
            return `${msg} ${JSON.stringify(arg)}`;
          } catch {
            return `${msg} [Object]`;
          }
        }
        return `${msg} ${arg}`;
      }, message);
    }
    
    // 로그 메시지 포맷팅
    const formattedMessage = `[${this.getTimestamp()}] [WARN] ${combinedMessage}`;
    
    // 콘솔에 출력
    console.warn(formattedMessage);
    
    // 버퍼에 추가
    this.logBuffer.push(formattedMessage);
    
    // 버퍼 크기가 최대치에 도달하면 저장
    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flushLogs();
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async error(message: string, ...args: any[]): Promise<void> {
    // 추가 인자가 있으면 결합
    let combinedMessage = message;
    if (args.length > 0) {
      combinedMessage = args.reduce((msg, arg) => {
        // 에러 객체 처리
        if (arg instanceof Error) {
          return `${msg} ${arg.message}\n${arg.stack}`;
        }
        // 객체 처리
        else if (typeof arg === 'object' && arg !== null) {
          try {
            return `${msg} ${JSON.stringify(arg)}`;
          } catch {
            return `${msg} [Object]`;
          }
        }
        return `${msg} ${arg}`;
      }, message);
    }
    
    // 로그 메시지 포맷팅
    const formattedMessage = `[${this.getTimestamp()}] [ERROR] ${combinedMessage}`;
    
    // 콘솔에 출력
    console.error(formattedMessage);
    
    // 버퍼에 추가
    this.logBuffer.push(formattedMessage);
    
    // 버퍼 크기가 최대치에 도달하면 저장
    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flushLogs();
    }
  }
  
  // 로그 버퍼 저장
  async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logContent = this.logBuffer.join('\n') + '\n';
    // 버퍼 비우기 전에 복사
    const bufferCopy = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      // 로컬 파일에 로그 저장 (백업)
      const localFilePath = path.join(this.localLogDir, this.logFileName);
      fs.appendFileSync(localFilePath, logContent);
      console.log(`[로거] ${bufferCopy.length}개 로그 항목을 로컬에 저장했습니다.`);
      
      // Supabase Storage에 업로드
      try {
        // Supabase 클라이언트 가져오기 (관리자 권한)
        const supabase = getSupabaseAdmin();
        
        // 버킷이 존재하는지 확인
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
        
        // 버킷이 없으면 생성
        if (!bucketExists) {
          await supabase.storage.createBucket(this.bucketName, {
            public: false,
          });
          console.log(`[로거] '${this.bucketName}' 버킷을 생성했습니다.`);
        }
        
        // 파일 경로
        const filePath = `${this.currentDate}/${this.logFileName}`;
        
        // 로컬 파일의 전체 내용을 읽어 Supabase에 업로드 (더 안정적인 방법)
        // 이렇게 하면 파일 내용 동기화 문제를 예방할 수 있음
        const fullLocalContent = fs.readFileSync(localFilePath, 'utf8');
        
        // 파일 업로드 (덮어쓰기)
        const { error } = await supabase.storage
          .from(this.bucketName)
          .upload(filePath, fullLocalContent, {
            upsert: true, // 이미 존재하면 덮어쓰기
            contentType: 'text/plain',
          });
        
        if (error) {
          console.error(`[로거] Supabase 업로드 실패: ${error.message}`);
          throw error;
        }
        
        console.log(`[로거] 로그 파일을 Supabase에 성공적으로 업로드했습니다. (${this.currentDate}/${this.logFileName})`);
      } catch (error) {
        console.error('[로거] Supabase 로그 업로드 실패:', error);
        // 로컬에 저장했으므로 다음 시도에서 재업로드되도록 버퍼를 일부 복원
        this.scheduleRetry();
      }
    } catch (error) {
      console.error('[로거] 로그 저장 실패:', error);
      // 버퍼 복원
      this.logBuffer = [...this.logBuffer, ...bufferCopy];
    }
  }
  
  // 실패한 업로드 재시도 스케줄링
  private scheduleRetry(): void {
    setTimeout(() => {
      console.log('[로거] Supabase 업로드 재시도 중...');
      
      // 로컬 파일을 다시 읽어서 Supabase에 업로드 시도
      try {
        const localFilePath = path.join(this.localLogDir, this.logFileName);
        if (fs.existsSync(localFilePath)) {
          const fileContent = fs.readFileSync(localFilePath, 'utf8');
          
          // 비동기 호출하되 에러 처리만 추가
          const supabase = getSupabaseAdmin();
          supabase.storage
            .from(this.bucketName)
            .upload(`${this.currentDate}/${this.logFileName}`, fileContent, {
              upsert: true,
              contentType: 'text/plain',
            })
            .then(({ error }) => {
              if (error) {
                console.error('[로거] 재시도 실패:', error);
                // 다시 재시도 스케줄링
                this.scheduleRetry();
              } else {
                console.log('[로거] 재시도 성공: 로그 파일이 업로드되었습니다.');
              }
            })
            .catch(err => {
              console.error('[로거] 재시도 중 예외 발생:', err);
              this.scheduleRetry();
            });
        }
      } catch (error) {
        console.error('[로거] 재시도 준비 중 오류:', error);
      }
    }, 5 * 60 * 1000); // 5분 후 재시도
  }
  
  // 프로세스 종료 시 로그 저장
  async shutdown(): Promise<void> {
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }
    await this.flushLogs();
  }
}

// 싱글톤 인스턴스
const globalForLogger = global as unknown as { logger: LogManager };

export const getLogger = (): LogManager => {
  if (!globalForLogger.logger) {
    globalForLogger.logger = new LogManager();
  }
  return globalForLogger.logger;
};

// 프로세스 종료 이벤트 핸들링
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await getLogger().shutdown();
  });

  process.on('SIGINT', async () => {
    await getLogger().shutdown();
  });
}

// 편의를 위한 기본 로거 인스턴스
export const logger = getLogger(); 