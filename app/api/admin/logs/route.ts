/**
 * 관리자 로그 조회 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/utils/adminAuth';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

export async function GET(request: NextRequest) {
  // 인증 확인
  if (!verifyAdminToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'all'; // all, error, warn, info, debug
    const date = searchParams.get('date'); // YYYY-MM-DD
    const keyword = searchParams.get('keyword') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // 로그 파일 목록 가져오기
    if (!fs.existsSync(LOG_DIR)) {
      return NextResponse.json({
        logs: [],
        files: [],
        message: '로그 디렉토리가 없습니다.'
      });
    }
    
    const logFiles = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.txt'))
      .sort()
      .reverse();
    
    // 특정 날짜 파일 또는 최근 파일
    const targetFile = date 
      ? `log_${date}.txt`
      : logFiles[0];
    
    if (!targetFile || !logFiles.includes(targetFile)) {
      return NextResponse.json({
        logs: [],
        files: logFiles,
        message: '해당 날짜의 로그 파일이 없습니다.'
      });
    }
    
    // 로그 파일 읽기
    const filePath = path.join(LOG_DIR, targetFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // 필터링
    let filteredLogs = lines;
    
    // 레벨 필터
    if (level !== 'all') {
      const levelUpper = level.toUpperCase();
      filteredLogs = filteredLogs.filter(line => line.includes(`[${levelUpper}]`));
    }
    
    // 키워드 필터
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      filteredLogs = filteredLogs.filter(line => 
        line.toLowerCase().includes(keywordLower)
      );
    }
    
    // 최근 로그부터 (역순)
    filteredLogs = filteredLogs.reverse().slice(0, limit);
    
    // 로그 파싱
    const parsedLogs = filteredLogs.map(line => {
      const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);
      if (match) {
        return {
          timestamp: match[1],
          level: match[2],
          message: match[3]
        };
      }
      return {
        timestamp: '',
        level: 'UNKNOWN',
        message: line
      };
    });
    
    return NextResponse.json({
      logs: parsedLogs,
      files: logFiles,
      currentFile: targetFile,
      totalLines: lines.length,
      filteredCount: parsedLogs.length
    });
    
  } catch (error) {
    console.error('로그 조회 오류:', error);
    return NextResponse.json(
      { error: '로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
