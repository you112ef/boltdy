import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={classNames(
      'peer h-6 w-6 shrink-0 rounded-sm border transition-colors flex items-center justify-center min-w-[48px] min-h-[48px]', // Increased base size, added flex centering and min-touch target
      'bg-transparent dark:bg-transparent',
      'border-gray-400 dark:border-gray-600',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-purple-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-purple-500 dark:data-[state=checked]:bg-purple-500',
      'data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-500',
      'data-[state=checked]:text-white',
      className,
    )}
    {...props}
  >
    {/* The actual visual checkbox can be smaller and centered */}
    <div className="h-4 w-4 border border-gray-400 dark:border-gray-600 rounded-sm data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500 flex items-center justify-center">
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </div>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
