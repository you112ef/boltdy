import React from 'react';
import { classNames } from '~/utils/classNames';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors';
  
  const variantClasses = {
    default: 'bg-accent-500 text-white',
    secondary: 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor',
    destructive: 'bg-red-500 text-white',
    outline: 'border border-bolt-elements-borderColor text-bolt-elements-textPrimary',
  };

  return (
    <span className={classNames(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
}