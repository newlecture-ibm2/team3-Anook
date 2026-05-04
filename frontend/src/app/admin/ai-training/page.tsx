'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import RagCandidateCard from '@/components/ui/Card/RagCandidateCard';
import KnowledgeEditModal from '@/components/ui/Knowledge/KnowledgeEditModal';
import styles from './page.module.css';

export default function AiTrainingPage() {
  const [searchValue, setSearchValue] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<any>(null);

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>AI 학습 관리</h1>
        </div>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder="검색어를 입력하세요..." 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: '전체', value: 'all' }, 
              { label: '지식 없음', value: 'missing' },
              { label: '의도 불명', value: 'unclear' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.cardList}>
        <RagCandidateCard 
          department="프론트 데스크"
          aiReason="RAG_MISSING"
          roomNumber="1001"
          consultationContent="직원: 고객님, 레이트 체크아웃은 오후 2시까지 가능하며 5만원의 추가 요금이 발생합니다."
          timestamp="10:30 AM"
          onAddRag={(content) => {
            setSelectedKnowledge({
              domainCode: "FRONT",
              question: "",
              answer: content,
              updatedAt: "방금 전",
              isNew: true
            });
            setIsEditModalOpen(true);
          }}
          onReject={() => console.log('Rejected')}
        />
        <RagCandidateCard 
          department="하우스키핑"
          aiReason="INTENT_UNCLEAR"
          roomNumber="204"
          consultationContent="직원: 고객님, 엑스트라 베드 설치는 무료로 진행해 드리겠습니다."
          timestamp="11:45 AM"
          onAddRag={(content) => {
            setSelectedKnowledge({
              domainCode: "HK",
              question: "",
              answer: content,
              updatedAt: "방금 전",
              isNew: true
            });
            setIsEditModalOpen(true);
          }}
          onReject={() => console.log('Rejected')}
        />
      </div>

      {selectedKnowledge && isEditModalOpen && (
        <KnowledgeEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            if (selectedKnowledge.isNew) {
              setSelectedKnowledge(null);
            }
          }}
          initialDomainCode={selectedKnowledge.domainCode}
          initialQuestion={selectedKnowledge.question}
          initialAnswer={selectedKnowledge.answer}
          onSave={(data) => {
            console.log('Saved knowledge:', data);
            setIsEditModalOpen(false);
            setSelectedKnowledge(null);
          }}
        />
      )}
    </div>
  );
}
