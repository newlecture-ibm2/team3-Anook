import React, { useState, useEffect, useRef } from 'react';
import styles from './ProgressIndicator.module.css';
import SparklesIcon from '@/components/icons/SparklesIcon';
import ChatBubble from '../ChatBubble';
import { useTranslation } from '@/app/useTranslation';

const ShimmerText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (text !== displayedText) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedText(text);
        setIsTransitioning(false);
      }, 300); // fade out duration
      return () => clearTimeout(timer);
    }
  }, [text, displayedText]);

  return (
    <span className={`${styles.shimmerText} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
      {displayedText}
    </span>
  );
};

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
        <span className={styles.description}>
          <ShimmerText text={getLabelText()} />
        </span>
      </div>
    </ChatBubble>
  );
}
