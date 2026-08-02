'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import styles from './DemoModal.module.css';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 데모 역할 카드 정의
 * 실제 PIN/접속 코드는 서버(/api/auth/demo)에만 있고, 여기서는 역할명만 전달한다.
 */
const DEMO_ROLES = [
  {
    key: 'GUEST',
    emoji: '🧑',
    title: '투숙객으로 체험',
    desc: '707호 김철수님으로 접속합니다. AI 챗봇에 원하는 것을 자유롭게 요청해보세요.',
    variant: 'guest',
  },
  {
    key: 'ADMIN',
    emoji: '🏨',
    title: '관리자로 체험',
    desc: '프론트데스크 대시보드에서 실시간 요청 현황과 AI 자동 분배를 확인하세요.',
    variant: 'admin',
  },
] as const;

/**
 * 데모 로그인 안내 모달
 *
 * 접속 코드를 모르는 방문자(포트폴리오 관람자)가
 * 게스트/관리자 화면으로 바로 진입할 수 있게 한다.
 */
export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePick = async (role: string) => {
    setLoadingRole(role);
    setError('');

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      router.push(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setLoadingRole(null);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard
        size="md"
        onClose={onClose}
        title="처음 오셨나요?"
        subtitle="접속 코드 없이 아래 계정으로 서비스를 둘러보실 수 있습니다."
      >
        <div className={styles.cards}>
          {DEMO_ROLES.map((role) => (
            <button
              key={role.key}
              type="button"
              className={`${styles.roleCard} ${styles[role.variant]}`}
              onClick={() => handlePick(role.key)}
              disabled={loadingRole !== null}
            >
              <span className={styles.emoji} aria-hidden="true">{role.emoji}</span>
              <strong className={styles.roleTitle}>
                {loadingRole === role.key ? '접속하는 중...' : role.title}
              </strong>
              <span className={styles.roleDesc}>{role.desc}</span>
            </button>
          ))}
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <p className={styles.hint}>
          이미 접속 코드가 있으시다면 닫기 후 직접 입력하실 수 있습니다.
        </p>
      </ModalCard>
    </ModalOverlay>
  );
}
