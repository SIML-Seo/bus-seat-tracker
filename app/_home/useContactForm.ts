import { useState } from 'react';

export const DEVELOPER_EMAIL = 'galdor308@gmail.com';

type CopyStatus = 'idle' | 'copied' | 'failed';

// 개발자 문의: 이메일 복사 / 메일 앱 열기 / 웹 문의 폼(Slack 알림)
export const useContactForm = () => {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const toggleOptions = () => {
    setIsOptionsOpen(!isOptionsOpen);
    setCopyStatus('idle');
    if (isFormOpen && !isOptionsOpen) {
      setIsFormOpen(false);
    }
  };

  const openForm = () => {
    setIsFormOpen(true);
    setIsOptionsOpen(false);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSubmitted(false);
  };

  const openMailApp = () => {
    window.open(`mailto:${DEVELOPER_EMAIL}?subject=좌석 버스 잔여석 통계 웹사이트 문의`, '_blank');
    setIsOptionsOpen(false);
  };

  // 결과는 메뉴 안에서 바로 보여준다. (alert 대신 인라인 피드백)
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(DEVELOPER_EMAIL);
      setCopyStatus('copied');
    } catch {
      // 비보안 컨텍스트/권한 거부 시 clipboard API가 실패한다. 주소는 화면에 보이므로 직접 복사하도록 안내한다.
      setCopyStatus('failed');
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        throw new Error('메시지 전송에 실패했습니다. 나중에 다시 시도해주세요.');
      }
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 전송에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    state: { isOptionsOpen, isFormOpen, name, email, message, submitted, submitting, error, copyStatus },
    handlers: {
      toggleOptions,
      openForm,
      closeForm,
      openMailApp,
      copyEmail,
      submit,
      changeName: setName,
      changeEmail: setEmail,
      changeMessage: setMessage,
    },
  };
};
