import React from 'react';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

export interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ asChild, children }) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
  }

  const handleClick = (event: React.MouseEvent) => {
    children.props.onClick?.(event);
    context.setOpen(!context.open);
  };

  if (asChild) {
    return React.cloneElement(children, { onClick: handleClick });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
};

export interface DropdownMenuContentProps {
  className?: string;
  align?: 'start' | 'end';
  children: React.ReactNode;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ className, children }) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenuContent must be used within DropdownMenu');
  }

  if (!context.open) return null;

  return (
    <div className={className}>
      {children}
    </div>
  );
};

export interface DropdownMenuItemProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ className, onClick, children }) => (
  <button
    type="button"
    role="menuitem"
    className={className}
    onClick={onClick}
  >
    {children}
  </button>
);
