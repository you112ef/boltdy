import { memo, forwardRef, type ForwardedRef } from 'react';
import { classNames } from '~/utils/classNames';

type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface BaseIconButtonProps {
  size?: IconSize;
  className?: string;
  iconClassName?: string;
  disabledClassName?: string;
  title?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

type IconButtonWithoutChildrenProps = {
  icon: string;
  children?: undefined;
} & BaseIconButtonProps;

type IconButtonWithChildrenProps = {
  icon?: undefined;
  children: string | JSX.Element | JSX.Element[];
} & BaseIconButtonProps;

type IconButtonProps = IconButtonWithoutChildrenProps | IconButtonWithChildrenProps;

// Componente IconButton com suporte a refs
export const IconButton = memo(
  forwardRef(
    (
      {
        icon,
        size = 'xl',
        className,
        iconClassName,
        disabledClassName,
        disabled = false,
        title,
        onClick,
        children,
      }: IconButtonProps,
      ref: ForwardedRef<HTMLButtonElement>,
    ) => {
      return (
        <button
          ref={ref}
          className={classNames(
            'flex items-center text-bolt-elements-item-contentDefault bg-transparent enabled:hover:text-bolt-elements-item-contentActive rounded-md p-1 enabled:hover:bg-bolt-elements-item-backgroundActive disabled:cursor-not-allowed focus:outline-none',
            {
              [classNames('opacity-30', disabledClassName)]: disabled,
            },
            className,
          )}
          title={title}
          disabled={disabled}
          onClick={(event) => {
            if (disabled) {
              return;
            }

            onClick?.(event);
          }}
        >
          {children ? children : <div className={classNames(icon, getIconSize(size), iconClassName)}></div>}
        </button>
      );
    },
  ),
);

function getIconSize(size: IconSize) {
  switch (size) {
    case 'sm':
      return 'text-xs sm:text-sm'; // 12px -> 14px
    case 'md':
      return 'text-sm sm:text-base'; // 14px -> 16px
    case 'lg':
      return 'text-base sm:text-lg'; // 16px -> 18px
    case 'xl':
      return 'text-lg sm:text-xl'; // 18px -> 20px (default size for IconButton is xl)
    case 'xxl':
      return 'text-xl sm:text-2xl'; // 20px -> 24px
    default:
      return 'text-lg sm:text-xl'; // Default to xl sizing
  }
}
