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
import useAiLogs, { AiLogDetail } from './useAiLogs';

export default function AiRoutingPage() {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AiLogDetail | null>(null);
  const [isRatingExpanded, setIsRatingExpanded] = useState(false);
  
  const { summary, logs, ratingsData, loading, error } = useAiLogs();

  const handleOpenModal = (log: AiLogDetail) => {
    setSelectedLog(log);
    setIsLogModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
    setIsLogModalOpen(false);
  };

  const extractUserInput = (rawPrompt: string) => {
    if (!rawPrompt) return '';
    const delimiter = 'User Input:\n';
    const parts = rawPrompt.split(delimiter);
    return parts.length > 1 ? parts[parts.length - 1].trim() : rawPrompt;
  };

  const truncateText = (text: string, length: number) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const PromptPreview = ({ rawPrompt }: { rawPrompt: string }) => {
    const input = extractUserInput(rawPrompt);
    const truncated = truncateText(input, 150);
    const lines = truncated.split('\n').filter(line => line.trim() !== '');

    return (
      <div className={styles.previewContainer}>
        {lines.map((line, idx) => {
          if (line.startsWith('AI:')) {
            return <div key={idx}><span className={styles.previewAi}>AI:</span> {line.replace('AI:', '').trim()}</div>;
          } else if (line.startsWith('고객:')) {
            return <div key={idx}><span className={styles.previewCustomer}>고객:</span> {line.replace('고객:', '').trim()}</div>;
          } else if (line.startsWith('[')) {
            return <div key={idx} className={`${styles.previewMeta} ${idx > 0 ? styles.previewMetaTop : ''}`}>{line}</div>;
          }
          return <div key={idx}>{line}</div>;
        })}
      </div>
    );
  };

  const StarDisplay = ({ rating }: { rating: number }) => (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </span>
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>{t.frontdeskPage.taskBoard.titles.aiRouting}</h1>
        <div className={styles.headerActions}>
          <InputField 
            variant="search" 
            placeholder={t.frontdeskPage.taskBoard.searchPlaceholder} 
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <FilterButton 
            filterOptions={[
              { label: t.frontdeskPage.taskBoard.filterAll, value: 'all' }, 
              { label: t.frontdeskPage.taskBoard.filterLatest, value: 'latest' }
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
          value={summary ? `Avg. ${summary.averageLatencyMs.toLocaleString()}ms` : "Avg. 0ms"} 
          changeValue="●" 
          changeType="positive" 
        />
        <SummaryCard 
          title="누적 소모 토큰" 
          value={summary ? `Total ${summary.totalTokens.toLocaleString()} Tokens` : "Total 0 Tokens"} 
        />
        <SummaryCard 
          title="AI 라우팅 성공률" 
          value={summary ? `${summary.routingSuccessRate}%` : "0%"} 
          changeValue={summary ? `Fallback: ${summary.fallbackRate}%` : "Fallback: 0%"} 
          changeType="neutral" 
        />
        <SummaryCard 
          title="고객 만족도" 
          value={ratingsData.totalCount > 0 ? `${ratingsData.averageRating}/5` : "—"} 
          changeValue={ratingsData.totalCount > 0 ? `${ratingsData.totalCount}건` : undefined} 
          changeType={ratingsData.averageRating >= 4 ? 'positive' : ratingsData.averageRating >= 3 ? 'neutral' : 'negative'} 
          onClick={() => setIsRatingExpanded(!isRatingExpanded)}
        />
      </div>

      {/* Rating Detail Panel (Expandable) */}
      {isRatingExpanded && (
        <div className={styles.ratingPanel}>
          <div className={styles.ratingPanelHeader}>
            <h3 className={styles.ratingPanelTitle}>AI 처리 요청 별점 상세</h3>
            <button className={styles.ratingCloseBtn} onClick={() => setIsRatingExpanded(false)}>✕</button>
          </div>
          {ratingsData.ratings.length === 0 ? (
            <div className={styles.ratingEmpty}>등록된 AI 피드백이 없습니다.</div>
          ) : (
            <div className={styles.ratingList}>
              {ratingsData.ratings.map((item) => (
                <div key={item.requestId} className={styles.ratingItem}>
                  <div className={styles.ratingItemLeft}>
                    <StarDisplay rating={item.rating} />
                    <span className={styles.ratingDept}>{item.departmentId}</span>
                  </div>
                  <div className={styles.ratingItemCenter}>
                    {item.summary || '요청 내용 없음'}
                  </div>
                  <div className={styles.ratingItemRight}>
                    <span className={styles.ratingRoom}>{item.roomNo}호</span>
                    <span className={styles.ratingDate}>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table Section */}
      <div className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>세부 접속 로그</h2>
          <span className={styles.sortText}>최신순 정렬</span>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>{error}</div>
        ) : (
          <Table columns="1.5fr 4fr 1fr 1.5fr 1fr">
            <TableHeader>
              <TableCell>시간</TableCell>
              <TableCell>요청 미리보기</TableCell>
              <TableCell>총 토큰</TableCell>
              <TableCell>지연시간</TableCell>
              <TableCell></TableCell>
            </TableHeader>
            
            {logs.map(log => (
              <TableRow key={log.id} className={styles.autoHeightRow}>
                <TableCell>{formatDate(log.createdAt)}</TableCell>
                <TableCell className={styles.autoWrapCell}><PromptPreview rawPrompt={log.rawPrompt} /></TableCell>
                <TableCell><b>{log.totalTokens.toLocaleString()}</b></TableCell>
                <TableCell>
                  {log.latencyMs >= 3000 ? (
                    <>
                      <b style={{ color: 'var(--color-tag-text-red)' }}>{log.latencyMs}ms</b>
                      <span style={{ 
                        marginLeft: 'var(--space-8)', 
                        background: 'var(--color-tag-bg-red)', 
                        color: 'var(--color-tag-text-red)', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold' 
                      }}>SLOW</span>
                    </>
                  ) : (
                    <b>{log.latencyMs}ms</b>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="secondary" onClick={() => handleOpenModal(log)}>상세 보기</Button>
                </TableCell>
              </TableRow>
            ))}
            
            {logs.length === 0 && (
              <TableRow>
                <TableCell>No logs found.</TableCell>
              </TableRow>
            )}
          </Table>
        )}
      </div>

      {/* Log Data Modal */}
      <LogDataModal
        isOpen={isLogModalOpen}
        onClose={handleCloseModal}
        log={selectedLog}
      />
    </div>
  );
}
