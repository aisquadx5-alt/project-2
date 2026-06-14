import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant: 'success' | 'danger' | 'warning' | 'neutral';
  className?: string;
  dot?: boolean;
}

export default function Badge({ children, variant, className = '', dot = false }: BadgeProps) {
  // Map variant to colors from Zenith / CSS variables
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'var(--success-bg)',
          text: 'var(--success-text)',
          border: 'rgba(0, 108, 73, 0.15)',
          dotColor: 'var(--success)'
        };
      case 'danger':
        return {
          bg: 'var(--danger-bg)',
          text: 'var(--danger-text)',
          border: 'rgba(186, 26, 26, 0.15)',
          dotColor: 'var(--danger)'
        };
      case 'warning':
        return {
          bg: 'var(--warning-bg)',
          text: 'var(--warning-text)',
          border: 'rgba(239, 68, 68, 0.15)',
          dotColor: 'var(--warning)'
        };
      case 'neutral':
      default:
        return {
          bg: 'var(--surface-container-high)',
          text: 'var(--text-muted)',
          border: 'var(--border)',
          dotColor: 'var(--text-light)'
        };
    }
  };

  const colors = getColors();

  return (
    <span 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 500,
        padding: '3px 8px',
        borderRadius: '12px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.2
      }}
    >
      {dot && (
        <span 
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: colors.dotColor,
            flexShrink: 0
          }}
        />
      )}
      {children}
    </span>
  );
}
