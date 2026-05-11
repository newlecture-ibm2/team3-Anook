import React from 'react';
import styles from './ProgressIndicator.module.css';
import SparklesIcon from '@/components/icons/SparklesIcon';
import ChatBubble from '../ChatBubble';
import { useTranslation } from '@/app/useTranslation';

interface ProgressIndicatorProps {
  domains?: string[];
}

export default function ProgressIndicator({ domains = [] }: ProgressIndicatorProps) {
  const { t } = useTranslation();

  const getLabelText = () => {
    if (!domains || domains.length === 0) {
      return t.guestChat.progress.checking;
    }
    
    const domainDict = t.guestChat.progress.domains as Record<string, string>;
    const labels = domains
      .map(code => domainDict[code] || code)
      .filter(Boolean);
      
    if (labels.length === 0) {
      return t.guestChat.progress.checking;
    }

    const domainText = labels.join(', ');
    return `${t.guestChat.progress.forwardingPrefix}${domainText}${t.guestChat.progress.forwardingSuffix}`;
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
