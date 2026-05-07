'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import { HandoverRecord } from '@/components/ui/HandoverRecord';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

const sampleHandoverItems = [
  { id: 1, roomNumber: '1204', guestName: '김민수', requestDetails: '[에어컨 수리] 에어컨 작동 안 됨' },
  { id: 2, roomNumber: '1204', guestName: '김민수', requestDetails: '[수건 교체] 새 수건 3장 추가 요청' },
  { id: 3, roomNumber: '805', guestName: '박지원', requestDetails: '[룸서비스] 치즈버거 1세트 주문' },
  { id: 4, roomNumber: '502', guestName: '이지현', requestDetails: '[침구류 정리] 엑스트라 베드 설치 요청' },
  { id: 5, roomNumber: '302', guestName: '최승우', requestDetails: '[샤워기 헤드 교체] 수압 약함' },
  { id: 6, roomNumber: '2105', guestName: '홍길동', requestDetails: '[레스토랑 예약] 오늘 저녁 7시 미슐랭 레스토랑 2명 예약 요청' },
  { id: 7, roomNumber: '1001', guestName: '홍길동', requestDetails: '[객실 내 응급 환자] 심한 복통 호소, 의료진 지원 필요' },
];

const sampleHandoverBriefing = {
  id: 1,
  shiftStart: '2026-04-30 09:00',
  shiftEnd: '2026-04-30 18:00',
  totalRequestCount: 45,
  pendingCount: 2,
  escalatedCount: 1,
  summary: '대부분의 요청이 원활하게 처리되었으나, 1204호 에어컨 수리 건이 부품 문제로 지연 중. 야간 근무 시 진행 상황 팔로업 요망.',
  createdAt: '2026-04-30 17:55'
};

export default function HandoverPage() {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.adminPage.taskBoard.titles.handover}</h1>
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

      <HandoverRecord
        managerName="박단희"
        briefing={sampleHandoverBriefing}
        items={sampleHandoverItems}
      />
    </div>
  );
}
