'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ModalOverlay.module.css';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ModalOverlay({ isOpen, onClose, children }: ModalOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [isMouseDownOnOverlay, setIsMouseDownOnOverlay] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC 키로 닫기 등 부가 기능 지원
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className={styles.overlay} 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setIsMouseDownOnOverlay(true);
        }
      }}
      onMouseUp={(e) => {
        if (isMouseDownOnOverlay && e.target === e.currentTarget) {
          onClose();
        }
        setIsMouseDownOnOverlay(false);
      }}
    >
      {children}
    </div>,
    document.body
  );
}

