import React from 'react';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeMap = {
    sm: { outer: 20, inner: 14, border: 2 },
    md: { outer: 36, inner: 24, border: 3 },
    lg: { outer: 56, inner: 38, border: 4 },
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="relative flex items-center justify-center"
        style={{ width: s.outer, height: s.outer }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: `${s.border}px solid rgba(16, 185, 129, 0.1)`,
            borderTopColor: '#fbbf24',
            borderRightColor: 'rgba(251,191,36,0.4)',
          }}
        />
        {/* Inner ring (opposite spin) */}
        <div
          className="rounded-full animate-spin"
          style={{
            width: s.inner,
            height: s.inner,
            border: `${s.border}px solid rgba(16, 185, 129, 0.05)`,
            borderBottomColor: '#10b981',
            borderLeftColor: 'rgba(16,185,129,0.35)',
            animationDirection: 'reverse',
            animationDuration: '0.7s',
          }}
        />
      </div>
      {text && (
        <p className="text-xs font-bold" style={{ color: 'rgba(52,211,153,0.5)' }}>{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
