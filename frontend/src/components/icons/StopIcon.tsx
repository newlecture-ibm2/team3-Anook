import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

export default function StopIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={color} 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
