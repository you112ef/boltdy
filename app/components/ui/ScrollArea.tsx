import React from 'react';
import { classNames } from '~/utils/classNames';

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollArea({ children, className }: ScrollAreaProps) {
  return (
    <div
      className={classNames(
        'overflow-auto scrollbar-thin scrollbar-thumb-bolt-elements-borderColor scrollbar-track-transparent',
        className
      )}
    >
      {children}
    </div>
  );
}