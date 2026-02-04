import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendContactNotification } from '@/lib/slack/notifications';

// 간단한 이메일 유효성 검사 함수
function isValidEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();
    
    // 필수 필드 확인
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '모든 필드를 채워주세요.' }, 
        { status: 400 }
      );
    }
    
    // 입력 길이 검증
    const NAME_MAX_LENGTH = 100;
    const EMAIL_MAX_LENGTH = 254;
    const MESSAGE_MAX_LENGTH = 5000;
    
    if (typeof name !== 'string' || name.length > NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `이름은 ${NAME_MAX_LENGTH}자 이내로 입력해주세요.` }, 
        { status: 400 }
      );
    }
    
    if (typeof email !== 'string' || email.length > EMAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: `이메일은 ${EMAIL_MAX_LENGTH}자 이내로 입력해주세요.` }, 
        { status: 400 }
      );
    }
    
    if (typeof message !== 'string' || message.length > MESSAGE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `메시지는 ${MESSAGE_MAX_LENGTH}자 이내로 입력해주세요.` }, 
        { status: 400 }
      );
    }
    
    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 주소를 입력해주세요.' }, 
        { status: 400 }
      );
    }
    
    // 입력값 trim 처리
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMessage = message.trim();
    
    // Prisma를 사용하여 DB에 저장
    const contact = await prisma.contact.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage
      }
    });
    
    console.log('새 문의가 접수되었습니다:', { name: trimmedName, email: trimmedEmail });
    
    // 슬랙으로 알림 전송
    await sendContactNotification(contact);
    
    return NextResponse.json({ 
      success: true, 
      message: '문의가 성공적으로 전송되었습니다.',
      id: contact.id
    });
    
  } catch (error) {
    console.error('문의 처리 중 오류 발생:', error);
    
    // 프로덕션에서는 상세 에러 정보 숨김
    return NextResponse.json(
      { error: '문의 처리 중 오류가 발생했습니다. 나중에 다시 시도해주세요.' }, 
      { status: 500 }
    );
  }
} 