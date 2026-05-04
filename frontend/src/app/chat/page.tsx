'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function ChatLoginHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      autoLogin(code);
    } else {
      // 코드가 없으면 기본 로그인 페이지로 이동
      router.replace('/login');
    }
  }, [code, router]);

  const autoLogin = async (accessCode: string) => {
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode }),
      });

      if (response.ok) {
        // 로그인 성공 시 게스트 채팅 페이지로 리다이렉트
        router.replace('/guest/chat');
      } else {
        console.error('Auto login failed');
        router.replace('/login?error=invalid_code');
      }
    } catch (error) {
      console.error('Error during auto login:', error);
      router.replace('/login?error=server_error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      <p className={styles.text}>잠시만 기다려주세요...<br />객실 서비스를 연결 중입니다.</p>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatLoginHandler />
    </Suspense>
  );
}
