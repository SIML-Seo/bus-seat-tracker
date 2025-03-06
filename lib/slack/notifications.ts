/**
 * 슬랙 알림 전송을 위한 유틸리티 함수
 */

/**
 * 슬랙으로 문의 알림을 보냅니다.
 * @param {object} contact - 문의 정보 객체
 * @returns {Promise<boolean>} - 전송 성공 여부
 */
export async function sendContactNotification(contact: { 
  id: string;
  name: string; 
  email: string; 
  message: string;
  createdAt?: Date;
}): Promise<boolean> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.');
      return false;
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🔔 새로운 문의가 접수되었습니다",
              emoji: true
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*이름:*\n${contact.name}`
              },
              {
                type: "mrkdwn",
                text: `*이메일:*\n${contact.email}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*문의 내용:*\n${contact.message}`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `접수 ID: ${contact.id} | 접수 시간: ${contact.createdAt ? new Date(contact.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('슬랙 알림 전송 실패:', errorText);
      return false;
    }
    
    console.log(`슬랙 알림 전송 완료: ${contact.name}님의 문의`);
    return true;
  } catch (error) {
    console.error('슬랙 알림 전송 중 오류 발생:', error);
    return false;
  }
} 