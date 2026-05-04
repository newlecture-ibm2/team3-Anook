'use client';

import React from 'react';
import styles from './KnowledgeItem.module.css';
import StatusBadge from '@/components/ui/StatusBadge/StatusBadge';

export interface KnowledgeItemProps {
  id: number;
  domainCode: string;
  question: string;
  answer: string;
  updatedAt: string;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export default function KnowledgeItem({ domainCode, question, answer, updatedAt, onClick, onEdit, onDelete }: KnowledgeItemProps) {
  return (
    <div className={styles.container} onClick={onClick}>
      <div className={styles.topRow}>
        <div className={styles.badgeWrapper}>
          <StatusBadge variant="gray">{domainCode}</StatusBadge>
        </div>
        <div className={styles.actions}>
          <span 
            className={styles.actionIcon} 
            title="수정"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(e);
            }}
          >
            ✏️
          </span>
          <span 
            className={styles.actionIcon} 
            title="삭제"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(e);
            }}
          >
            🗑️
          </span>
        </div>
      </div>
      <h3 className={styles.title}>{question}</h3>
      <p className={styles.description}>{answer}</p>
      <div className={styles.footer}>
        <span className={styles.dateText}>최종 업데이트: {updatedAt}</span>
      </div>
    </div>
  );
}
