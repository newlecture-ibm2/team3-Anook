'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import KnowledgeItem from '@/components/ui/Knowledge/KnowledgeItem';
import KnowledgeModal from '@/components/ui/Knowledge/KnowledgeModal';
import KnowledgeEditModal from '@/components/ui/Knowledge/KnowledgeEditModal';
import Button from '@/components/ui/Button/Button';
import Tabs from '@/components/ui/Tab/Tabs';
import { useKnowledge, KnowledgeEntry } from '../../useKnowledge';
import styles from './KnowledgePageContent.module.css';
import { useTranslation } from '@/app/useTranslation';

interface KnowledgePageContentProps {
  title: string;
  domainCode?: string; // 없으면 전체 도메인
}

export default function KnowledgePageContent({ title, domainCode: initialDomainCode }: KnowledgePageContentProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialDomainCode || 'ALL');
  const { data, loading, error, createEntry, updateEntry, deleteEntry } = useKnowledge(activeTab === 'ALL' ? undefined : activeTab);
  
  const [searchValue, setSearchValue] = useState('');
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const ALL_OPTIONS = [
    { value: 'HK', label: t.adminPage.rag.tabs.HK },
    { value: 'FB', label: t.adminPage.rag.tabs.FB },
    { value: 'FACILITY', label: t.adminPage.rag.tabs.FACILITY },
    { value: 'CONCIERGE', label: t.adminPage.rag.tabs.CONCIERGE },
    { value: 'FRONT', label: t.adminPage.rag.tabs.FRONT },
    { value: 'EMERGENCY', label: t.adminPage.rag.tabs.EMERGENCY },
    { value: 'COMMON', label: t.adminPage.rag.tabs.COMMON }
  ];

  const TAB_OPTIONS = [
    { value: 'ALL', label: t.adminPage.rag.tabs.ALL },
    ...ALL_OPTIONS
  ];

  // 현재 페이지의 특성에 따라 domainOptions 생성 (지식 추가 시 사용)
  const domainOptions = initialDomainCode 
    ? ALL_OPTIONS.filter(opt => opt.value === initialDomainCode)
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
          <InputField 
            variant="search" 
            placeholder={t.adminPage.rag.searchPlaceholder} 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={styles.searchInput}
          />
          <FilterButton 
            filterOptions={[
              { label: t.adminPage.rag.filterAll, value: 'all' }, 
              { label: t.adminPage.rag.filterLatest, value: 'latest' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
            className={styles.filterBtn}
          />
        </div>
      </div>

      {/* Tabs Section */}
      <div className={styles.tabSection}>
        <Tabs 
          options={TAB_OPTIONS}
          activeValue={activeTab}
          onChange={(val) => setActiveTab(val || 'ALL')}
        />
      </div>

      {/* Content Section */}
      <div className={styles.contentSection}>
        <div className={styles.buttonWrapper}>
          <Button 
            variant="primary" 
            onClick={() => {
              setIsCreatingNew(true);
              setIsEditModalOpen(true);
            }}
          >
            {t.adminPage.rag.addKnowledge}
          </Button>
        </div>

        {loading ? (
          <div className={styles.statusMessage}>{t.common.loading}</div>
        ) : error ? (
          <div className={styles.errorMessage}>{error}</div>
        ) : (
          <div className={styles.listContainer}>
            {filteredData.length === 0 ? (
              <div className={styles.emptyMessage}>{t.adminPage.rag.empty}</div>
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
                    if (confirm(t.adminPage.rag.deleteConfirm)) {
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
            if (confirm(t.adminPage.rag.deleteConfirm)) {
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
          initialDomainCode={isCreatingNew ? (activeTab === 'ALL' ? 'HK' : activeTab) : selectedKnowledge?.domainCode}
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
