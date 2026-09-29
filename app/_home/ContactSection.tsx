import { DEVELOPER_EMAIL, useContactForm } from './useContactForm';

const INPUT_CLASS =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent';

// 하단 정보·문의 영역. 문의 메뉴(이메일 복사/메일 앱/웹 문의)와 웹 문의 폼을 담는다.
export const ContactSection = () => {
  const { state, handlers } = useContactForm();

  return (
    <footer className="border-t border-line px-4 pb-10 pt-5 text-sm">
      <p className="max-w-prose text-xs leading-relaxed text-muted">
        공공데이터포털 API로 경기도 좌석·광역버스(2층 버스 제외)의 위치와 잔여석을 주기적으로 수집해, 정류장·요일·시간대별 평균 잔여석을 보여줍니다.
      </p>

      <div className="mt-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p className="text-xs text-faint">© {new Date().getFullYear()} 좌석 버스 잔여석</p>
        <div className="relative">
          <button
            type="button"
            aria-expanded={state.isOptionsOpen}
            onClick={handlers.toggleOptions}
            className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:bg-sunken"
          >
            개발자에게 문의하기
          </button>

          {state.isOptionsOpen && (
            <div className="absolute bottom-10 left-0 z-10 mb-1 w-60 rounded-lg border border-line bg-surface p-2 shadow-md sm:left-auto sm:right-0">
              <div className="mb-2 p-1 text-xs text-muted">
                개발자 이메일
                <div className="mt-1 flex justify-between gap-2">
                  <span className="font-medium text-ink-soft">{DEVELOPER_EMAIL}</span>
                  <button type="button" onClick={handlers.copyEmail} className="text-muted hover:text-ink">
                    {state.copyStatus === 'copied' ? '복사됨' : '복사'}
                  </button>
                </div>
                {state.copyStatus === 'failed' && (
                  <p className="mt-1 text-danger">복사에 실패했습니다. 주소를 직접 선택해 복사해주세요.</p>
                )}
              </div>
              <div className="my-1 border-t border-line"></div>
              <button type="button" onClick={handlers.openForm} className="w-full rounded p-2 text-left text-sm text-ink-soft hover:bg-subtle">
                웹사이트에서 문의하기
              </button>
              <button type="button" onClick={handlers.openMailApp} className="w-full rounded p-2 text-left text-sm text-ink-soft hover:bg-subtle">
                이메일 앱으로 열기
              </button>
            </div>
          )}
        </div>
      </div>

      {state.isFormOpen && (
        <div className="mt-4 rounded-xl border border-line bg-subtle p-4">
          {state.submitted ? (
            <div className="grid justify-items-start gap-3">
              <p className="text-success">문의를 보냈습니다. 확인 후 답장드리겠습니다.</p>
              <button type="button" onClick={handlers.closeForm} className="rounded-lg bg-ink px-4 py-2 text-sm text-surface hover:bg-ink-soft">
                닫기
              </button>
            </div>
          ) : (
            <form
              onSubmit={event => {
                event.preventDefault();
                handlers.submit();
              }}
              className="grid gap-3"
            >
              <p className="text-sm font-medium text-ink-soft">개발자에게 문의하기</p>
              {state.error && <p className="text-sm text-danger">{state.error}</p>}
              <input
                id="contact-name"
                type="text"
                value={state.name}
                onChange={event => handlers.changeName(event.target.value)}
                placeholder="이름"
                aria-label="이름"
                className={INPUT_CLASS}
                required
              />
              <input
                id="contact-email"
                type="email"
                value={state.email}
                onChange={event => handlers.changeEmail(event.target.value)}
                placeholder="답장받을 이메일"
                aria-label="이메일"
                className={INPUT_CLASS}
                required
              />
              <textarea
                id="contact-message"
                value={state.message}
                onChange={event => handlers.changeMessage(event.target.value)}
                placeholder="문의 내용"
                aria-label="문의 내용"
                className={`${INPUT_CLASS} h-24`}
                required
              ></textarea>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handlers.closeForm}
                  className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-muted hover:bg-surface"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={state.submitting}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm text-accent-ink hover:bg-accent-strong disabled:opacity-50"
                >
                  {state.submitting ? '보내는 중…' : '보내기'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </footer>
  );
};
