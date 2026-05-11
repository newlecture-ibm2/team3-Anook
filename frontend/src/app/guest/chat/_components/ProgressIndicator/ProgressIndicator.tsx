import React from 'react';
import styles from './ProgressIndicator.module.css';
import SparklesIcon from '@/components/icons/SparklesIcon';
import ChatBubble from '../ChatBubble';

interface ProgressIndicatorProps {
  domains?: string[];
}

const DOMAIN_LABELS: Record<string, string> = {
  HK: '하우스키핑',
  FB: '룸서비스',
  FACILITY: '시설관리',
  CONCIERGE: '컨시어지',
  FRONT: '프론트데스크',
  EMERGENCY: '긴급 대응',
};

export default function ProgressIndicator({ domains = [] }: ProgressIndicatorProps) {
  const getLabelText = () => {
    if (!domains || domains.length === 0) {
      return "요청하신 내용을 확인하고 있습니다...";
    }
    
    const labels = domains
      .map(code => DOMAIN_LABELS[code] || code)
      .filter(Boolean);
      
    if (labels.length === 0) {
      return "요청하신 내용을 확인하고 있습니다...";
    }

    const domainText = labels.join(', ');
    return `${domainText} 팀에 내용을 전달하고 있습니다...`;
  };

  return (
    <ChatBubble variant="received">
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <SparklesIcon />
        </div>
        <span className={styles.description}>{getLabelText()}</span>
      </div>
    </ChatBubble>
  );
}
