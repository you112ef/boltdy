import React from 'react';
import { classNames } from '~/utils/classNames';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={classNames(
        'relative h-2 w-full overflow-hidden rounded-full bg-bolt-elements-background-depth-2',
        className
      )}
    >
      <div
        className="h-full w-full flex-1 bg-accent-500 transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
}