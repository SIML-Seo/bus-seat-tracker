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
  private readonly maxBufferSize = 500; // 버퍼 최대 크기 (100 → 500)
  private readonly localLogDir: string;
  private bufferTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 5 * 60 * 1000; // 5분마다 강제 저장 (1분 → 5분)
  private bucketChecked = false; // 버킷 존재 여부 캐싱
  private lastUploadTime = 0; // 마지막 Supabase 업로드 시간
  private retryCount = 0; // 재시도 횟수
  private readonly maxRetries = 3; // 최대 재시도 횟수
  private readonly uploadInterval = 30 * 60 * 1000; // Supabase 업로드 간격 (30분)

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

  // 공통 메시지 포맷팅 함수
  private formatMessage(message: string, args: unknown[]): string {
    if (args.length === 0) return message;

    return args.reduce<string>((msg, arg) => {
      // 에러 객체 처리
      if (arg instanceof Error) {
        return `${msg} ${arg.message}\n${arg.stack}`;
      }
      // 객체 처리
      if (typeof arg === 'object' && arg !== null) {
        try {
          return `${msg} ${JSON.stringify(arg)}`;
        } catch {
          return `${msg} [Object]`;
        }
      }
      return `${msg} ${arg}`;
    }, message);
  }

  // 공통 로그 처리 함수
  private async writeLog(level: LogLevel, message: string, args: unknown[]): Promise<void> {
    // 날짜가 바뀌었는지 확인
    const currentDate = this.getFormattedDate();
    if (currentDate !== this.currentDate) {
      await this.flushLogs(true); // 날짜 변경 시 강제 업로드
      this.currentDate = currentDate;
      this.logFileName = `log_${this.currentDate}.txt`;
    }

    const combinedMessage = this.formatMessage(message, args);
    const formattedMessage = `[${this.getTimestamp()}] [${level.toUpperCase()}] ${combinedMessage}`;

    // 콘솔에 출력
    const consoleMethod = level === 'debug' ? console.debug :
                         level === 'warn' ? console.warn :
                         level === 'error' ? console.error :
                         console.log;
    consoleMethod(formattedMessage);

    // 버퍼에 추가
    this.logBuffer.push(formattedMessage);

    // 버퍼 크기가 최대치에 도달하면 저장
    if (this.logBuffer.length >= this.maxBufferSize) {
      await this.flushLogs();
    }
  }

  // 로그 메서드들
  async log(message: string, ...args: unknown[]): Promise<void> {
    return this.writeLog('info', message, args);
  }

  async debug(message: string, ...args: unknown[]): Promise<void> {
    return this.writeLog('debug', message, args);
  }

  async info(message: string, ...args: unknown[]): Promise<void> {
    return this.writeLog('info', message, args);
  }

  async warn(message: string, ...args: unknown[]): Promise<void> {
    return this.writeLog('warn', message, args);
  }

  async error(message: string, ...args: unknown[]): Promise<void> {
    return this.writeLog('error', message, args);
  }

  // 로그 버퍼 저장 (forceUpload: 강제 Supabase 업로드 여부)
  async flushLogs(forceUpload = false): Promise<void> {
    const localFilePath = path.join(this.localLogDir, this.logFileName);

    if (this.logBuffer.length > 0) {
      const logContent = this.logBuffer.join('\n') + '\n';
      const bufferCopy = [...this.logBuffer];
      this.logBuffer = [];

      try {
        // 로컬 파일에 로그 저장
        fs.appendFileSync(localFilePath, logContent);
        console.log(`[로거] ${bufferCopy.length}개 로그 항목을 로컬에 저장했습니다.`);
      } catch (error) {
        console.error('[로거] 로그 저장 실패:', error);
        this.logBuffer = [...this.logBuffer, ...bufferCopy];
        return;
      }
    }

    // Supabase 업로드: forceUpload이거나 30분 경과 시
    const now = Date.now();
    if (forceUpload || now - this.lastUploadTime >= this.uploadInterval) {
      if (fs.existsSync(localFilePath)) {
        await this.uploadToSupabase(localFilePath);
      }
    }
  }

  // Supabase Storage 업로드
  private async uploadToSupabase(localFilePath: string): Promise<void> {
    try {
      const supabase = getSupabaseAdmin();

      // 버킷 존재 여부 확인 (최초 1회만)
      if (!this.bucketChecked) {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

        if (!bucketExists) {
          await supabase.storage.createBucket(this.bucketName, { public: false });
          console.log(`[로거] '${this.bucketName}' 버킷을 생성했습니다.`);
        }

        this.bucketChecked = true;
      }

      const filePath = `${this.currentDate}/${this.logFileName}`;
      const fullLocalContent = fs.readFileSync(localFilePath, 'utf8');

      const { error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fullLocalContent, {
          upsert: true,
          contentType: 'text/plain',
        });

      if (error) {
        console.error(`[로거] Supabase 업로드 실패: ${error.message}`);
        throw error;
      }

      this.lastUploadTime = Date.now();
      this.retryCount = 0;
      console.log(`[로거] 로그 파일을 Supabase에 성공적으로 업로드했습니다. (${filePath})`);
    } catch (error) {
      console.error('[로거] Supabase 로그 업로드 실패:', error);
      this.scheduleRetry();
    }
  }

  // 실패한 업로드 재시도 스케줄링 (최대 3회)
  private scheduleRetry(): void {
    this.retryCount++;

    if (this.retryCount > this.maxRetries) {
      console.error(`[로거] 최대 재시도 횟수(${this.maxRetries}회) 초과. 재시도를 중단합니다.`);
      return;
    }

    setTimeout(() => {
      console.log(`[로거] Supabase 업로드 재시도 중... (${this.retryCount}/${this.maxRetries})`);

      try {
        const localFilePath = path.join(this.localLogDir, this.logFileName);
        if (fs.existsSync(localFilePath)) {
          const fileContent = fs.readFileSync(localFilePath, 'utf8');

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
                this.scheduleRetry();
              } else {
                console.log('[로거] 재시도 성공: 로그 파일이 업로드되었습니다.');
                this.lastUploadTime = Date.now();
                this.retryCount = 0;
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
    await this.flushLogs(true); // shutdown 시 강제 업로드
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
