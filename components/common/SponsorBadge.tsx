import React from 'react';

type SponsorBadgeProps = {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  count?: number;
};

const sizeClasses = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-2.5 py-1.5',
  lg: 'text-base px-3 py-2',
};

const SponsorBadge: React.FC<SponsorBadgeProps> = ({
  size = 'md',
  showLabel = false,
  animate = true,
  count = 0,
}) => {
  return (
    <span
      title={`Sponsored ${count} spots`}
      className={`inline-flex items-center gap-1.5 rounded-full border border-yellow-400/40 bg-gradient-to-r from-yellow-500/20 via-amber-300/20 to-yellow-500/20 text-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.35)] ${sizeClasses[size]} ${animate ? 'animate-pulse' : ''}`}
    >
      <span className="drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">⭐</span>
      {showLabel && <span className="font-bold">Sponsor</span>}
      {count > 0 && <span className="font-semibold">{count}</span>}
    </span>
  );
};

export default SponsorBadge;
