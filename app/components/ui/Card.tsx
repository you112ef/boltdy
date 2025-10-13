import React from 'react';
import { classNames } from '~/utils/classNames';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={classNames(
        'rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary shadow-sm',
        className
      )}
      {...props}
    />
  );
}