'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import KnowledgeItem from '@/components/ui/Knowledge/KnowledgeItem';
import KnowledgeModal from '@/components/ui/Knowledge/KnowledgeModal';
import KnowledgeEditModal from '@/components/ui/Knowledge/KnowledgeEditModal';
import Button from '@/components/ui/Button/Button';
import { useKnowledge, KnowledgeEntry } from '../../useKnowledge';
import styles from './KnowledgePageContent.module.css';

interface KnowledgePageContentProps {
  title: string;
  domainCode?: string; // 없으면 전체 도메인
}

export default function KnowledgePageContent({ title, domainCode }: KnowledgePageContentProps) {
  const { data, loading, error, createEntry, updateEntry, deleteEntry } = useKnowledge(domainCode);
  
  const [searchValue, setSearchValue] = useState('');
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const ALL_OPTIONS = [
    { value: 'HK', label: '하우스키핑 (HK)' },
    { value: 'FB', label: 'F&B (FB)' },
    { value: 'FACILITY', label: '시설 (FACILITY)' },
    { value: 'CONCIERGE', label: '컨시어지 (CONCIERGE)' },
    { value: 'FRONT', label: '프론트 (FRONT)' },
    { value: 'EMERGENCY', label: '긴급 (EMERGENCY)' },
    { value: 'COMMON', label: '공통 (COMMON)' }
  ];

  // 현재 페이지의 특성에 따라 domainOptions 생성
  const domainOptions = domainCode 
    ? ALL_OPTIONS.filter(opt => opt.value === domainCode)
    : ALL_OPTIONS;

  // 검색 필터 적용
  const filteredData = data.filter(item => 
    item.question.toLowerCase().includes(searchValue.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.headerActions}>
          <Button 
            variant="primary" 
            onClick={() => {
              setIsCreatingNew(true);
              setIsEditModalOpen(true);
            }}
          >
            + 지식 정보 추가
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.contentSection}>
        <div className={styles.filterSection}>
          <div className={styles.searchWrapper}>
            <InputField 
              variant="search" 
              placeholder="검색어를 입력하세요..." 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <FilterButton 
            filterOptions={[
              { label: '전체', value: 'all' }, 
              { label: '최신순', value: 'latest' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
          />
        </div>

        {loading ? (
          <div className={styles.statusMessage}>데이터를 불러오는 중입니다...</div>
        ) : error ? (
          <div className={styles.errorMessage}>{error}</div>
        ) : (
          <div className={styles.listContainer}>
            {filteredData.length === 0 ? (
              <div className={styles.emptyMessage}>등록된 지식이 없습니다.</div>
            ) : (
              filteredData.map((item) => (
                <KnowledgeItem
                  key={item.id}
                  id={item.id}
                  domainCode={item.domainCode}
                  question={item.question}
                  answer={item.answer}
                  updatedAt={new Date(item.updatedAt).toLocaleDateString()}
                  onClick={() => setSelectedKnowledge(item)}
                  onEdit={() => {
                    setSelectedKnowledge(item);
                    setIsEditModalOpen(true);
                  }}
                  onDelete={async () => {
                    if (confirm('정말로 이 지식을 삭제하시겠습니까?')) {
                      await deleteEntry(item.id);
                    }
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* View Modal */}
      {selectedKnowledge && !isEditModalOpen && (
        <KnowledgeModal
          isOpen={!!selectedKnowledge}
          onClose={() => setSelectedKnowledge(null)}
          domainCode={selectedKnowledge.domainCode}
          question={selectedKnowledge.question}
          answer={selectedKnowledge.answer}
          updatedAt={new Date(selectedKnowledge.updatedAt).toLocaleDateString()}
          onEdit={() => setIsEditModalOpen(true)}
          onDelete={async () => {
            if (confirm('정말로 이 지식을 삭제하시겠습니까?')) {
              await deleteEntry(selectedKnowledge.id);
              setSelectedKnowledge(null);
            }
          }}
        />
      )}

      {/* Edit / Create Modal */}
      {isEditModalOpen && (
        <KnowledgeEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            if (isCreatingNew) {
              setIsCreatingNew(false);
            }
          }}
          domainOptions={domainOptions}
          initialDomainCode={isCreatingNew ? (domainCode || 'HK') : selectedKnowledge?.domainCode}
          initialQuestion={isCreatingNew ? '' : selectedKnowledge?.question}
          initialAnswer={isCreatingNew ? '' : selectedKnowledge?.answer}
          onSave={async (formData) => {
            if (isCreatingNew) {
              await createEntry(formData);
            } else if (selectedKnowledge) {
              await updateEntry(selectedKnowledge.id, formData);
            }
            setIsEditModalOpen(false);
            setIsCreatingNew(false);
            setSelectedKnowledge(null);
          }}
        />
      )}
    </div>
  );
}
