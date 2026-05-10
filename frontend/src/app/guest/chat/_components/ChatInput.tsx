import React, { useState } from 'react';
import styles from './ChatInput.module.css';
import { SendIcon, MicIcon } from '@/components/icons';

export interface ChatInputProps {
  placeholder?: string;
  onSend?: (text: string) => void;
}

export default function ChatInput({ placeholder = '무엇이든 물어보세요...', onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (value.trim() && onSend) {
      onSend(value);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={styles.wrapper}>
      <input 
        className={styles.input} 
        placeholder={placeholder} 
        value={value} 
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.actionGroup}>
        {value.trim() === '' ? (
          <button className={`${styles.iconButton} ${styles.micButton}`} aria-label="음성 입력 (개발 중)">
            <MicIcon size={24} color="#b4a8c9" />
          </button>
        ) : (
          <button className={`${styles.iconButton} ${styles.sendButton}`} onClick={handleSend} aria-label="메시지 전송">
            <SendIcon size={24} color="#b4a8c9" />
          </button>
        )}
      </div>
    </div>
  );
}
