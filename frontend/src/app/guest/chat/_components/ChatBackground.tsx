import React from 'react';
import styles from './ChatBackground.module.css';

interface ChatBackgroundProps {
  isAiTyping: boolean;
  isUserTyping: boolean;
}

export default function ChatBackground({ isAiTyping, isUserTyping }: ChatBackgroundProps) {
  return (
    <div className={`${styles.backgroundContainer} ${isUserTyping ? styles.userTyping : ''}`}>
      <div className={`${styles.blob} ${styles.blob1} ${isAiTyping ? styles.active1 : ''}`} />
      <div className={`${styles.blob} ${styles.blob4} ${isAiTyping ? styles.active4 : ''}`} />
      <div className={`${styles.blob} ${styles.blob2} ${isAiTyping ? styles.active2 : ''}`} />
      <div className={`${styles.blob} ${styles.blob5} ${isAiTyping ? styles.active5 : ''}`} />
      <div className={`${styles.blob} ${styles.blob3} ${isAiTyping ? styles.active3 : ''}`} />
    </div>
  );
}
