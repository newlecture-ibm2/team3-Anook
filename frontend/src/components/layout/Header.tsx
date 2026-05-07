'use client';

import React from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useUiStore } from '@/stores/useUiStore';
import styles from './Header.module.css';

interface HeaderProps {
  className?: string;
}

export default function Header({ className = '' }: HeaderProps) {
  const { toggleSidebar } = useUiStore();

  return (
    <header className={`${styles.header} ${className}`.trim()}>
      <div className={styles.left}>
        <button className={styles.hamburgerBtn} onClick={toggleSidebar} aria-label="메뉴 열기">
          <Menu size={24} />
        </button>
        <Link href="/" style={{ 
          fontSize: '1.75rem', 
          fontWeight: 900, 
          letterSpacing: '-0.05em', 
          color: 'var(--color-primary, #0f172a)',
          textDecoration: 'none'
        }}>
          Anook
        </Link>
      </div>

      <div className={styles.right}>
        <LanguageToggle />
      </div>
    </header>
  );
}

function LanguageToggle() {
  const { language, setLanguage } = useUiStore();
  
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button 
        onClick={() => setLanguage('ko')}
        style={{
          background: language === 'ko' ? 'var(--color-primary, #0f172a)' : 'transparent',
          color: language === 'ko' ? 'white' : 'var(--color-gray-600, #475569)',
          border: '1px solid var(--color-gray-300, #cbd5e1)',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}
      >
        KO
      </button>
      <button 
        onClick={() => setLanguage('en')}
        style={{
          background: language === 'en' ? 'var(--color-primary, #0f172a)' : 'transparent',
          color: language === 'en' ? 'white' : 'var(--color-gray-600, #475569)',
          border: '1px solid var(--color-gray-300, #cbd5e1)',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}
      >
        EN
      </button>
    </div>
  );
}
