import React from 'react';
import styles from './ChatBubble.module.css';

export interface ChatBubbleProps {
  variant: 'sent' | 'received';
  isFallback?: boolean;
  isLatest?: boolean;
  children: React.ReactNode;
}

export default function ChatBubble({ variant, isFallback, isLatest = false, children }: ChatBubbleProps) {
  const renderContent = () => {
    if (typeof children !== 'string') return children;
    
    let text = children;
    if (variant === 'received') {
      // Add line breaks after Korean sentence endings (., ?, !)
      text = text.replace(/([가-힣][.?!])\s+/g, '$1\n');
    }
    
    return text.split('\n').map((line, i, arr) => (
      <React.Fragment key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`${styles.wrapper} ${variant === 'sent' ? styles.sentWrapper : styles.receivedWrapper}`}>
      {variant === 'received' ? (
        <div className={styles.receivedContainer}>
          {isLatest ? (
            <div className={styles.aiLogoContainer}>
              <div className={styles.aiLogoMask}>
                <div className={styles.orbBlue} />
                <div className={styles.orbPurple} />
                <div className={styles.orbPeach} />
              </div>
            </div>
          ) : (
            <div className={styles.aiLogoStatic} />
          )}
          <div className={`${styles.bubble} ${styles[variant]} ${isFallback ? styles.fallback : ''}`}>
            {renderContent()}
          </div>
        </div>
      ) : (
        <div className={`${styles.bubble} ${styles[variant]} ${isFallback ? styles.fallback : ''}`}>
          {renderContent()}
        </div>
      )}
    </div>
  );
}
