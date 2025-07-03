import * as Popover from '@radix-ui/react-popover';
import type { PropsWithChildren, ReactNode } from 'react';

export default ({
  children,
  trigger,
  side,
  align,
}: PropsWithChildren<{
  trigger: ReactNode;
  side: 'top' | 'right' | 'bottom' | 'left' | undefined;
  align: 'center' | 'start' | 'end' | undefined;
}>) => (
  <Popover.Root>
    <Popover.Trigger asChild>{trigger}</Popover.Trigger>
    <Popover.Anchor />
    <Popover.Portal>
      <Popover.Content
        sideOffset={10}
        side={side}
        align={align}
        className="bg-bolt-elements-background-depth-2 text-bolt-elements-item-contentAccent p-2 rounded-md shadow-xl z-workbench max-w-[calc(100vw-32px)] sm:max-w-sm md:max-w-md max-h-[80vh] sm:max-h-[70vh] overflow-y-auto"
      >
        {children}
        <Popover.Arrow className="fill-bolt-elements-background-depth-2" /> {/* Changed bg- to fill- */}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
);
