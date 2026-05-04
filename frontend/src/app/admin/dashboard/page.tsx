'use client';

import React, { useState } from 'react';
import InputField from '@/components/ui/Inputfield/InputField';
import FilterButton from '@/components/ui/FilterButton/FilterButton';
import ChartCard from '@/components/ui/Card/ChartCard';
import SummaryCard from '@/components/ui/Card/SummaryCard';
import useAdminStats from './useAdminStats';
import styles from './page.module.css';

const DEPT_NAMES: Record<string, string> = {
  HK: '하우스키핑', FB: '식음료', FACILITY: '시설',
  CONCIERGE: '컨시어지', FRONT: '긴급 대응'
};

const PRIORITY_NAMES: Record<string, string> = {
  URGENT: '긴급', HIGH: '높음', NORMAL: '보통', LOW: '낮음'
};

const DONUT_COLORS = ['#1a1a2e', '#4a4a5a', '#f97316', '#d1d5db'];

/**
 * 세로 막대 그래프 (참고 디자인: 검은 바, Y축 눈금, X축 부서명)
 */
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  // Y축 눈금: 0 ~ maxVal를 4등분
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * (4 - i)));

  return (
    <div className={styles.barChart}>
      <div className={styles.barYAxis}>
        {ticks.map((t, i) => (
          <span key={i} className={styles.barYLabel}>{t}</span>
        ))}
        <span className={styles.barYLabel}>0</span>
      </div>
      <div className={styles.barArea}>
        <div className={styles.barGridLines}>
          {ticks.map((_, i) => <div key={i} className={styles.barGridLine} />)}
        </div>
        <div className={styles.barColumns}>
          {data.map((item) => (
            <div key={item.label} className={styles.barCol}>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ height: `${(item.value / maxVal) * 100}%` }}
                />
              </div>
              <span className={styles.barXLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 도넛 차트 (참고 디자인: 다크 컬러, 우측 범례)
 */
function DonutChart({ data, colors }: { data: { label: string; value: number; pct: number }[]; colors: string[] }) {
  const size = 160;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={styles.donutWrapper}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, i) => {
          const dash = (item.pct / 100) * circumference;
          const currentOffset = -offset;
          offset += dash;
          return (
            <circle
              key={item.label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={currentOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <div className={styles.donutLegend}>
        {data.map((item, i) => (
          <div key={item.label} className={styles.legendRow}>
            <span className={styles.legendDot} style={{ background: colors[i % colors.length] }} />
            <span className={styles.legendName}>{item.label}</span>
            <span className={styles.legendPct}>{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('7d');
  const { stats, loading, error } = useAdminStats();

  const deptData = stats
    ? Object.entries(stats.byDepartment).map(([k, v]) => ({ label: DEPT_NAMES[k] || k, value: v }))
    : [];

  const priorityData = stats
    ? Object.entries(stats.byPriority).map(([k, v]) => ({
        label: PRIORITY_NAMES[k] || k,
        value: v,
        pct: stats.total > 0 ? Math.round((v / stats.total) * 100) : 0,
      }))
    : [];

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>대시보드</h1>
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
              { label: '오늘', value: '1d' }, 
              { label: '최근 7일', value: '7d' }, 
              { label: '최근 30일', value: '30d' }
            ]}
            selectedFilter={selectedFilter}
            onFilterSelect={(val) => setSelectedFilter(val)}
          />
        </div>
      </div>

      {/* Main Content Section (Charts) */}
      <div className={styles.chartsGrid}>
        <ChartCard title="부서별 평균 처리 시간" subtitle="AVERAGE RESOLUTION TIME (MINUTES)">
           <div className={styles.chartPlaceholder}>
              {loading ? '로딩 중...' : error ? error : <BarChart data={deptData} />}
           </div>
        </ChartCard>
        
        <ChartCard title="최다 요청 항목" subtitle="MOST FREQUENT REQUESTS (%)">
           <div className={styles.chartPlaceholder}>
              {loading ? '로딩 중...' : error ? error : (
                <DonutChart data={priorityData} colors={DONUT_COLORS} />
              )}
           </div>
        </ChartCard>
      </div>

      {/* Bottom Content Section (Summaries) */}
      <div className={styles.summaryGrid}>
        <SummaryCard 
          title="총 요청" 
          value={loading ? '-' : stats?.total ?? 0} 
          size="md" 
        />
        <SummaryCard 
          title="대기 중" 
          value={loading ? '-' : stats?.byStatus?.PENDING ?? 0} 
          size="md" 
        />
        <SummaryCard 
          title="진행 중" 
          value={loading ? '-' : (stats?.byStatus?.ASSIGNED ?? 0) + (stats?.byStatus?.IN_PROGRESS ?? 0)} 
          size="md" 
        />
        <SummaryCard 
          title="초과 건수" 
          value={loading ? '-' : stats?.overdueCount ?? 0} 
          changeType={stats && stats.overdueCount > 0 ? 'negative' : 'positive'}
          size="md" 
        />
      </div>
    </div>
  );
}
