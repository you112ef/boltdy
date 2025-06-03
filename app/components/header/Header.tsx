import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames(
        'flex items-center border-b h-[var(--header-height)]',
        'mobile-padding sm:p-5',
        'mobile-responsive',
        'safe-area-support header-pwa',
        {
          'border-transparent': !chat.started,
          'border-bolt-elements-borderColor': chat.started,
        }
      )}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer min-w-0">
        <div className="i-ph:sidebar-simple-duotone text-xl sm:text-2xl mobile-touch" />
        <a href="/" className="text-lg sm:text-xl md:text-2xl font-semibold text-accent flex items-center min-w-0">
          <img 
            src="/logo-light-styled.png" 
            alt="logo" 
            className="w-16 sm:w-20 md:w-[90px] inline-block dark:hidden" 
          />
          <img 
            src="/logo-dark-styled.png" 
            alt="logo" 
            className="w-16 sm:w-20 md:w-[90px] inline-block hidden dark:block" 
          />
        </a>
      </div>
      {chat.started && (
        <>
          <span className="flex-1 px-2 sm:px-4 truncate text-center text-bolt-elements-textPrimary min-w-0 hidden sm:block">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1 sm:mr-2">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
