import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface Tab {
  /** Unique identifier for the tab */
  id: string;

  /** Content to display in the tab */
  label: React.ReactNode;

  /** Optional icon to display before the label */
  icon?: string;
}

interface TabsWithSliderProps {
  /** Array of tab objects */
  tabs: Tab[];

  /** ID of the currently active tab */
  activeTab: string;

  /** Function called when a tab is clicked */
  onChange: (tabId: string) => void;

  /** Additional class name for the container */
  className?: string;

  /** Additional class name for inactive tabs */
  tabClassName?: string;

  /** Additional class name for the active tab */
  activeTabClassName?: string;

  /** Additional class name for the slider */
  sliderClassName?: string;
}

/**
 * TabsWithSlider component
 *
 * A tabs component with an animated slider that moves to the active tab.
 */
export function TabsWithSlider({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  activeTabClassName,
  sliderClassName,
}: TabsWithSliderProps) {
  // State for slider dimensions
  const [sliderDimensions, setSliderDimensions] = useState({ width: 0, left: 0 });

  // Refs for tab elements
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Update slider position when active tab changes
  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

    if (activeIndex !== -1 && tabsRef.current[activeIndex]) {
      const activeTabElement = tabsRef.current[activeIndex];

      if (activeTabElement) {
        setSliderDimensions({
          width: activeTabElement.offsetWidth,
          left: activeTabElement.offsetLeft,
        });
      }
    }
  }, [activeTab, tabs]);

  return (
    <div className={classNames('relative flex gap-1 sm:gap-2 overflow-x-auto modern-scrollbar', className)}> {/* Added overflow and responsive gap */}
      {/* Tab buttons */}
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => (tabsRef.current[index] = el)}
          onClick={() => onChange(tab.id)}
          className={classNames(
            'rounded-lg transition-all duration-200 flex items-center gap-1 sm:gap-2 justify-center relative overflow-hidden',
            'h-9 sm:h-10', // Responsive height
            'px-3 sm:px-4 py-1 sm:py-2', // Responsive padding
            'text-xs sm:text-sm', // Responsive text
            tab.id === activeTab
              ? classNames('text-white shadow-sm shadow-purple-500/20', activeTabClassName)
              : classNames(
                  'bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary-dark hover:bg-bolt-elements-background-depth-3 dark:hover:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark',
                  tabClassName,
                ),
          )}
        >
          <span className={classNames('flex items-center gap-1 sm:gap-2 whitespace-nowrap', tab.id === activeTab ? 'font-medium' : '')}> {/* Added whitespace-nowrap and responsive gap */}
            {tab.icon && <span className={classNames(tab.icon, "text-base sm:text-lg")} />} {/* Responsive icon size */}
            {tab.label}
          </span>
        </button>
      ))}

      {/* Animated slider */}
      <motion.div
        className={classNames('absolute bottom-0 left-0 rounded-lg bg-purple-500 -z-10 h-9 sm:h-10', sliderClassName)} {/* Responsive height */}
        initial={false}
        animate={{
          width: sliderDimensions.width,
          x: sliderDimensions.left,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
