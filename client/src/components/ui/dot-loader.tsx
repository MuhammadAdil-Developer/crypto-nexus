import React from 'react';
import { cn } from '@/lib/utils';

interface DotLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const DotLoader: React.FC<DotLoaderProps> = ({ size = 'md', color = 'text-blue-500', className }) => {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const animationDelayClasses = [
    'animate-bounce-delay-100',
    'animate-bounce-delay-200',
    'animate-bounce-delay-300',
  ];

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {animationDelayClasses.map((delayClass, index) => (
        <span
          key={index}
          className={cn(
            "rounded-full bg-current",
            sizeClasses[size],
            color,
            delayClass
          )}
        ></span>
      ))}
    </div>
  );
};
