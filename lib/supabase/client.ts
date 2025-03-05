import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Supabase 클라이언트 초기화
export const supabase = createClient(supabaseUrl, supabaseKey);

// 싱글톤 패턴으로 사용할 때는 아래처럼 활용 가능
// (서버리스 환경에서 다중 연결 방지)
const globalForSupabase = global as unknown as { 
  supabase: ReturnType<typeof createClient>;
  supabaseAdmin: ReturnType<typeof createClient>;
};

export const getSupabase = () => {
  if (globalForSupabase.supabase) {
    return globalForSupabase.supabase;
  }
  
  globalForSupabase.supabase = createClient(supabaseUrl, supabaseKey);
  return globalForSupabase.supabase;
};

// 서비스 롤 키를 사용하는 Admin 클라이언트
// 로깅 시스템과 같이 높은 권한이 필요한 작업에 사용
export const getSupabaseAdmin = () => {
  if (globalForSupabase.supabaseAdmin) {
    return globalForSupabase.supabaseAdmin;
  }
  
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. 로깅 시스템에 문제가 발생할 수 있습니다.');
  }
  
  globalForSupabase.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  return globalForSupabase.supabaseAdmin;
}; 