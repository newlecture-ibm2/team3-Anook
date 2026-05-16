import React, { useState } from 'react';
import styles from './ChatBubble.module.css';
import { CancelIcon } from '@/components/icons';

export interface ChatBubbleProps {
  variant: 'sent' | 'received';
  isFallback?: boolean;
  isLatest?: boolean;
  imageUrl?: string;
  children: React.ReactNode;
}

export default function ChatBubble({ variant, isFallback, isLatest = false, imageUrl, children }: ChatBubbleProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  const renderImage = () => {
    if (!imageUrl) return null;
    return (
      <div className={styles.imageContainer}>
        <img
          src={imageUrl}
          alt="첨부 이미지"
          className={styles.attachedImage}
          onClick={() => setIsLightboxOpen(true)}
        />
      </div>
    );
  };

  return (
    <>
      <div className={`${styles.wrapper} ${variant === 'sent' ? styles.sentWrapper : styles.receivedWrapper}`}>
        {variant === 'received' ? (
          <div className={styles.receivedContainer}>
            {!isFallback && (
              isLatest ? (
                <div className={styles.aiLogoContainer}>
                  <div className={styles.aiLogoMask}>
                    <div className={styles.orbBlue} />
                    <div className={styles.orbPurple} />
                    <div className={styles.orbPeach} />
                  </div>
                </div>
              ) : (
                <div className={styles.aiLogoStatic} />
              )
            )}
            <div className={`${styles.bubble} ${styles[variant]} ${isFallback ? styles.fallback : ''}`}>
              {renderContent()}
            </div>
          </div>
        ) : (
          <div className={styles.sentContainer}>
            {renderImage()}
            {(typeof children === 'string' && children.trim()) || typeof children !== 'string' ? (
              <div className={`${styles.bubble} ${styles[variant]} ${isFallback ? styles.fallback : ''}`}>
                {renderContent()}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 이미지 확대 보기 (라이트박스) */}
      {isLightboxOpen && imageUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setIsLightboxOpen(false)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={imageUrl} alt="첨부 이미지 확대" className={styles.lightboxImage} />
            <button className={styles.lightboxClose} onClick={() => setIsLightboxOpen(false)} aria-label="닫기">
              <CancelIcon width={24} height={24} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
