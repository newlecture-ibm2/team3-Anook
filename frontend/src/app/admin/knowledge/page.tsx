'use client';

import React, { useState } from 'react';
import Tabs from '@/components/ui/Tab/Tabs';
import KnowledgeLibraryTab from './_components/KnowledgeLibraryTab/KnowledgeLibraryTab';
import KnowledgeReviewTab from './_components/KnowledgeReviewTab/KnowledgeReviewTab';
import { useTranslation } from '@/app/useTranslation';
import styles from './page.module.css';

export default function KnowledgeManagementPage() {
  const { t } = useTranslation();
  
  // 대분류 탭 (AI 학습 관리 vs RAG 데이터 관리)
  const [mainTab, setMainTab] = useState<'REVIEW' | 'LIBRARY'>('REVIEW');
  
  // 중분류 탭 (도메인별 필터)
  const [subTab, setSubTab] = useState('ALL');

  const MAIN_TAB_OPTIONS = [
    { value: 'REVIEW', label: '학습 관리 (AI Training)' },
    { value: 'LIBRARY', label: 'RAG 데이터 관리 (RAG)' }
  ];

  const SUB_TAB_OPTIONS = [
    { value: 'ALL', label: t.adminPage.rag.tabs.ALL },
    { value: 'HK', label: t.adminPage.rag.tabs.HK },
    { value: 'FB', label: t.adminPage.rag.tabs.FB },
    { value: 'FACILITY', label: t.adminPage.rag.tabs.FACILITY },
    { value: 'CONCIERGE', label: t.adminPage.rag.tabs.CONCIERGE },
    { value: 'FRONT', label: t.adminPage.rag.tabs.FRONT },
    { value: 'EMERGENCY', label: t.adminPage.rag.tabs.EMERGENCY },
    { value: 'COMMON', label: t.adminPage.rag.tabs.COMMON }
  ];

  return (
    <div className={styles.container}>
      {/* 2-Depth Tabs Section */}
      <div className={styles.tabsWrapper}>
        <div className={styles.mainTabs}>
          <Tabs 
            options={MAIN_TAB_OPTIONS}
            activeValue={mainTab}
            onChange={(val) => {
              setMainTab(val as 'REVIEW' | 'LIBRARY');
              setSubTab('ALL'); // 대분류 변경 시 중분류 초기화
            }}
          />
        </div>
        <div className={styles.subTabs}>
          <Tabs 
            options={SUB_TAB_OPTIONS}
            activeValue={subTab}
            onChange={(val) => setSubTab(val || 'ALL')}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.contentWrapper}>
        {mainTab === 'REVIEW' ? (
          <KnowledgeReviewTab domainCode={subTab} />
        ) : (
          <KnowledgeLibraryTab domainCode={subTab} />
        )}
      </div>
    </div>
  );
}
