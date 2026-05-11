'use client';

import React from 'react';
import KnowledgeEditModal from '@/components/ui/Knowledge/KnowledgeEditModal';
import { useRegisterTraining } from './useRegisterTraining';

interface RegisterTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  // page.tsx의 target 데이터를 받기 위한 props
  departmentId?: string;
  summary?: string;
  roomNo?: string;
}

export default function RegisterTrainingModal({
  isOpen,
  onClose,
  departmentId = '',
  summary = '',
  roomNo = '',
}: RegisterTrainingModalProps) {
  const { registerTraining } = useRegisterTraining();

  // 사용자가 저장 버튼을 눌렀을 때 실행되는 함수
  const handleSave = async (data: { domainCode: string; question: string; answer: string }) => {
    const success = await registerTraining({
      question: data.question,
      answer: data.answer,
      domainCode: data.domainCode,
      roomNo,
    });

    if (success) {
      // 성공적으로 등록되면 모달 닫기
      // (토스트 메시지는 KnowledgeEditModal 내부에서 이미 띄워줌)
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <KnowledgeEditModal
      isOpen={isOpen}
      onClose={onClose}
      initialDomainCode={departmentId}
      initialQuestion={summary}
      onSave={handleSave}
    />
  );
}
