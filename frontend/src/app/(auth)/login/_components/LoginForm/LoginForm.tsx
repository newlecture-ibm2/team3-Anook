'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUiStore } from '@/stores/useUiStore';
import { SecurityIcon } from '@/components/icons';
import { useLoginForm } from '../useLoginForm';
import CommonLoginForm from '@/components/ui/LoginForm/LoginForm';
import DemoModal from '../DemoModal/DemoModal';
import styles from '../../login.module.css';

interface CurrentSession {
  name?: string;
  role?: string;
}

/** 역할별 기본 진입 페이지 (useLoginForm, 데모 로그인과 동일한 규칙) */
const roleToPath = (role?: string) =>
  role === 'FRONTDESK' ? '/frontdesk/requests'
  : role === 'GUEST' ? '/guest/chat'
  : '/staff';

/**
 * 서비스 로그인 페이지 컴포넌트
 * 공통 UI 컴포넌트인 LoginForm을 사용하여 구성되었습니다.
 */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pin, setPin, isLoading, error, performLogin } = useLoginForm();
  const { showToast } = useUiStore();

  // 데모 안내 팝업은 방문할 때마다 자동으로 연다. (접속 코드를 모르는 방문자를 위한 안내)
  const [isDemoOpen, setIsDemoOpen] = useState(true);
  const [session, setSession] = useState<CurrentSession | null>(null);

  // URL 파라미터에서 에러 확인 (중복 로그인 등)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'DUPLICATE_LOGIN') {
      showToast('다른 기기에서 로그인이 감지되어 세션이 종료되었습니다.', 'error');
      router.replace('/login');
    }
  }, [searchParams, showToast, router]);

  // 로그인 상태로 이 화면에 들어온 경우를 배너로 안내한다.
  // (미들웨어가 더 이상 리다이렉트하지 않으므로 세션이 살아있을 수 있다)
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSession(data))
      .catch(() => {
        /* 조회 실패는 비로그인으로 간주한다 */
      });
  }, []);

  const handleLogin = (code: string) => {
    performLogin(code);
  };

  return (
    <div className={styles.container}>
      {session?.name && (
        <div className={styles.sessionBanner}>
          <span className={styles.sessionText}>
            현재 <strong>{session.name}</strong>님으로 접속 중입니다
          </span>
          <div className={styles.sessionActions}>
            <button
              type="button"
              className={styles.sessionPrimary}
              onClick={() => router.push(roleToPath(session.role))}
            >
              이어서 보기
            </button>
            <button
              type="button"
              className={styles.sessionGhost}
              onClick={() => setIsDemoOpen(true)}
            >
              역할 바꾸기
            </button>
          </div>
        </div>
      )}

      <CommonLoginForm
        title="ANOOK"
        subtitle="AI 기반 호텔 통합 관리 시스템"
        icon={<SecurityIcon width={32} height={32} />}
        placeholder="PIN 번호 또는 접속 코드 입력"
        onLogin={handleLogin}
        isLoading={isLoading}
        error={error || ''}
        maxLength={20} // ★ 길이를 20자리로 확장
        footerContent={
          <>
            <button
              type="button"
              className={styles.demoTrigger}
              onClick={() => setIsDemoOpen(true)}
            >
              데모 계정으로 둘러보기
            </button>
            <p>© 2026 Team Anook. All rights reserved.</p>
            <p>관리자 문의: 02-1234-5678</p>
          </>
        }
      />

      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}
