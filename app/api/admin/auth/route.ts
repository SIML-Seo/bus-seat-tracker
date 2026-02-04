/**
 * 관리자 인증 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/utils/adminAuth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

/**
 * 관리자 인증
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '관리자 비밀번호가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }
    
    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }
    
    // 토큰 생성
    const token = createAdminToken();
    
    return NextResponse.json({
      success: true,
      token
    });
    
  } catch (error) {
    console.error('인증 오류:', error);
    return NextResponse.json(
      { error: '인증 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
