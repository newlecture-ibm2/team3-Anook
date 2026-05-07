'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import SummaryCard from '@/components/ui/Card/SummaryCard';
import { Table, TableHeader, TableRow, TableCell } from '@/components/ui/Table/Table';
import Button from '@/components/ui/Button/Button';
import LogDataModal from '@/components/ui/Modal/LogDataModal';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

export default function AiRoutingPage() {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{t.adminPage.taskBoard.titles.aiRouting}</h1>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder={t.adminPage.taskBoard.searchPlaceholder} 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: t.adminPage.taskBoard.filterAll, value: 'all' }, 
              { label: t.adminPage.taskBoard.filterLatest, value: 'latest' }
            ]}
            selectedFilter="all"
            onFilterSelect={() => {}}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <SummaryCard 
          title="평균 응답 속도" 
          value="Avg. 1623ms" 
          changeValue="●" 
          changeType="positive" 
        />
        <SummaryCard 
          title="누적 소모 토큰" 
          value="Total 4,600 Tokens" 
        />
        <SummaryCard 
          title="AI 라우팅 성공률" 
          value="92.0%" 
          changeValue="Fallback: 8.0%" 
          changeType="neutral" 
        />
      </div>

      {/* Table Section */}
      <div className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>세부 접속 로그</h2>
          <span className={styles.sortText}>최신순 정렬</span>
        </div>
        
        <Table columns="1.5fr 4fr 1fr 1.5fr 1fr">
          <TableHeader>
            <TableCell>시간</TableCell>
            <TableCell>요청 미리보기</TableCell>
            <TableCell>총 토큰</TableCell>
            <TableCell>지연시간</TableCell>
            <TableCell></TableCell>
          </TableHeader>
          <TableRow>
            <TableCell>2026.10.26 14:05:12</TableCell>
            <TableCell>수건 2장 더 가져다주세요. 그리고 가습기가 있으면 좋겠어요.</TableCell>
            <TableCell><b>1,520</b></TableCell>
            <TableCell><b>850ms</b></TableCell>
            <TableCell>
              <Button variant="secondary" onClick={() => setIsLogModalOpen(true)}>상세 보기</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>2026.10.26 14:12:45</TableCell>
            <TableCell>화장실 전구가 나갔어요. 확인 부탁드립니다.</TableCell>
            <TableCell><b>1,430</b></TableCell>
            <TableCell>
              <b style={{ color: 'var(--color-tag-text-red)' }}>3100ms</b>
              <span style={{ 
                marginLeft: 'var(--space-8)', 
                background: 'var(--color-tag-bg-red)', 
                color: 'var(--color-tag-text-red)', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '12px',
                fontWeight: 'bold' 
              }}>SLOW</span>
            </TableCell>
            <TableCell>
              <Button variant="secondary" onClick={() => setIsLogModalOpen(true)}>상세 보기</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>2026.10.26 14:15:33</TableCell>
            <TableCell>저녁 7시에 이탈리안 레스토랑 예약 가능한가요?</TableCell>
            <TableCell><b>1,650</b></TableCell>
            <TableCell><b>920ms</b></TableCell>
            <TableCell>
              <Button variant="secondary" onClick={() => setIsLogModalOpen(true)}>상세 보기</Button>
            </TableCell>
          </TableRow>
        </Table>
      </div>

      {/* Log Data Modal */}
      <LogDataModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </div>
  );
}
