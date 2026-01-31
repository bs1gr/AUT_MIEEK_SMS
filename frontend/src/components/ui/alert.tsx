import React from 'react';

export interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ className, children }) => (
  <div role="alert" className={className}>
    {children}
  </div>
);

export interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ className, children }) => (
  <div className={className}>{children}</div>
);
