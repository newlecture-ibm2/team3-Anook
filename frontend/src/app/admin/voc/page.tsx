'use client';

import React, { useState, useMemo } from 'react';
import styles from './page.module.css';
import { useVocList } from './useVocList';
import { useRatingList } from './useRatingList';
import Tabs from '@/components/ui/Tab/Tabs';
import VocTable from './_components/VocTable/VocTable';
import RatingTable from './_components/RatingTable/RatingTable';
import { useTranslation } from '@/app/useTranslation';

type FilterType = 'ALL' | 'POSITIVE' | 'NEGATIVE' | 'RATING';

export default function VocPage() {
  const { t } = useTranslation();
  const { vocList, loading, error, refetch } = useVocList();
  const { ratings, loading: ratingsLoading, averageRating } = useRatingList();
  const [filter, setFilter] = useState<FilterType>('ALL');

  const FILTER_OPTIONS = [
    { value: 'ALL', label: t.adminPage.voc.filterAll },
    { value: 'POSITIVE', label: t.adminPage.voc.filterPositive },
    { value: 'NEGATIVE', label: t.adminPage.voc.filterNegative },
    { value: 'RATING', label: t.adminPage.voc.filterRating },
  ];

  const filteredVocs = useMemo(() => {
    if (filter === 'ALL') return vocList;
    if (filter === 'RATING') return []; // 별점 탭에서는 VOC 목록 안 씀
    return vocList.filter(voc => voc.sentiment === filter);
  }, [vocList, filter]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{t.adminPage.voc.title}</h1>
        <p className={styles.subtitle}>
          {t.adminPage.voc.subtitle}
        </p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          {error}
          <button 
            onClick={refetch} 
            style={{ marginLeft: '10px', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            {t.common.retry}
          </button>
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-16)' }}>
        <Tabs
          options={FILTER_OPTIONS}
          activeValue={filter}
          onChange={(val) => setFilter((val || 'ALL') as FilterType)}
          variant="pill"
        />
      </div>
      
      {filter === 'RATING' ? (
        <RatingTable ratings={ratings} loading={ratingsLoading} averageRating={averageRating} />
      ) : (
        <VocTable vocs={filteredVocs} loading={loading} />
      )}
    </div>
  );
}
