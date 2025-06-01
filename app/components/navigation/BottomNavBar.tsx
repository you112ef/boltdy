import { MdHome, MdChat, MdFolder, MdSettings } from 'react-icons/md';
import { Link, useLocation } from '@remix-run/react'; // Using Remix Link and useLocation for active state
import { classNames } from '~/utils/classNames';

const navItems = [
  { href: '/', label: 'Home', icon: MdHome },
  { href: '/chat', label: 'Chat', icon: MdChat }, // Assuming a /chat route exists
  { href: '/files', label: 'Files', icon: MdFolder }, // Assuming a /files route exists
  { href: '/settings', label: 'Settings', icon: MdSettings }, // Assuming a /settings route exists
];

export function BottomNavBar() {
  const location = useLocation();

  // Determine active link based on current pathname
  // This is a simple check; more complex logic might be needed for nested routes
  const activeLabel = navItems.find(item => location.pathname === item.href)?.label ||
                      (location.pathname.startsWith('/chat') && 'Chat') || // Handle active state for /chat/*
                      'Home'; // Default to Home if no match

  return (
    <nav
      className={classNames(
        "fixed bottom-0 left-0 right-0 h-[56px]",
        "bg-bolt-elements-bg-depth-1 border-t border-bolt-elements-borderColor",
        "flex justify-around items-center",
        "effect-blur effect-shadow" // Assuming these classes are defined globally e.g. in effects.scss
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeLabel === item.label;
        return (
          <Link
            key={item.label}
            to={item.href}
            className={classNames(
              "flex flex-col items-center justify-center p-1", // p-1 for a bit of padding around icon+text
              "min-w-[60px] h-[56px]", // Ensuring touch target and consistent height
              "text-xs text-bolt-elements-textSecondary",
              isActive ? "text-neon-purple" : "hover:text-bolt-elements-textPrimary"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={24} className={classNames("mb-0.5", isActive ? "text-neon-purple" : "")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
