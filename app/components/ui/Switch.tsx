import { memo } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { classNames } from '~/utils/classNames';

interface SwitchProps {
  className?: string;
  checked?: boolean;
  onCheckedChange?: (event: boolean) => void;
}

export const Switch = memo(({ className, onCheckedChange, checked }: SwitchProps) => {
  return (
    <SwitchPrimitive.Root
      className={classNames(
        'relative cursor-pointer rounded-full bg-bolt-elements-button-primary-background',
        'h-5 sm:h-6 w-9 sm:w-11', // Responsive track size
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-bolt-elements-item-contentAccent',
        className,
      )}
      checked={checked}
      onCheckedChange={(e) => onCheckedChange?.(e)}
    >
      <SwitchPrimitive.Thumb
        className={classNames(
          'block rounded-full bg-white',
          'h-4 w-4 sm:h-5 sm:w-5', // Responsive thumb size
          'shadow-lg shadow-black/20',
          'transition-transform duration-200 ease-in-out',
          'translate-x-[1px] sm:translate-x-0.5', // Responsive initial position
          'data-[state=checked]:translate-x-[19px] sm:data-[state=checked]:translate-x-[1.375rem]', // Responsive checked position
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
});
