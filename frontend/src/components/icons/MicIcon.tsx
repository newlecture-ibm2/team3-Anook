import React from 'react';

interface IconProps {
  width?: number | string;
  height?: number | string;
  color?: string;
  size?: number | string;
  className?: string;
}

export default function MicIcon({ width, height, color = 'currentColor', size, className }: IconProps) {
  const w = size || width || 24;
  const h = size || height || 24;
  return (
    <svg 
      width={w} 
      height={h} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
