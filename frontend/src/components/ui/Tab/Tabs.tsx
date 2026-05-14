'use client';

import React from 'react';
import styles from './Tabs.module.css';

export interface TabOption {
  value: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  /** 출력할 탭 데이터 목록 */
  options: TabOption[];
  /** 현재 선택된 탭의 value */
  activeValue: string;
  /** 탭 변경 시 호출될 콜백 함수 */
  onChange: (value: string) => void;
  className?: string;
}

export default function Tabs({
  options,
  activeValue,
  onChange,
  className = ''
}: TabsProps) {
  const containerClass = styles.variantLine;

  return (
    <div className={`${styles.container} ${containerClass} ${className}`.trim()} role="tablist">
      {options.map((option) => {
        const isActive = option.value === activeValue;
        
        let tabClass = styles.tabButton;
        tabClass += ` ${styles.lineTab} ${isActive ? styles.lineTabActive : ''}`;

        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            className={tabClass.trim()}
            onClick={() => onChange(isActive ? '' : option.value)}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={styles.countBadge}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
