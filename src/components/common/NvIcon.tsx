import React from 'react';

interface NvIconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const NvIcon: React.FC<NvIconProps> = ({ className = "w-4 h-4", style }) => {
  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-black text-[10px] leading-none tracking-tighter rounded-md bg-[#7A0C38] text-amber-300 px-1 py-0.5 border border-amber-400/50 shadow-sm select-none ${className}`}
      style={style}
    >
      NV
    </span>
  );
};
