import React from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noHover?: boolean;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  noHover = false,
  ...props
}) => {

  return (
    <div
      className={`
        relative overflow-hidden
        bg-surface text-foreground
        border border-border
        transition-all duration-200 ease-linear
        group
        ${!noHover ? 'hover:border-primary hover:shadow-hard hover:-translate-y-0.5' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Technical Markings */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50 opacity-50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/50 opacity-50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/50 opacity-50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50 opacity-50" />

      <div className="relative h-full z-10">{children}</div>

      {/* Scanline Effect Overlay */}
      <div className={`
        absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300
        bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]
        ${!noHover ? 'group-hover:opacity-100' : ''}
      `} />
    </div>
  );
};