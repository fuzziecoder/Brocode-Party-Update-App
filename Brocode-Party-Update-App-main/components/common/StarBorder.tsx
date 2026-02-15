import React from 'react';

type StarBorderProps<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
    as?: T;
    className?: string;
    children?: React.ReactNode;
    color?: string;
    speed?: React.CSSProperties['animationDuration'];
    thickness?: number;
};

const StarBorder = <T extends React.ElementType = 'div'>({
    as,
    className = '',
    color = '#6366f1',
    speed = '6s',
    thickness = 1,
    children,
    ...rest
}: StarBorderProps<T>) => {
    const Component = as || 'div';

    return (
        <Component
            className={`relative inline-block overflow-hidden rounded-[20px] ${className}`}
            {...(rest as any)}
            style={{
                padding: `${thickness}px 0`,
                ...(rest as any).style
            }}
        >
            <div
                className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0"
                style={{
                    background: `radial-gradient(circle, ${color}, transparent 10%)`,
                    animationDuration: speed
                }}
            ></div>
            <div
                className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0"
                style={{
                    background: `radial-gradient(circle, ${color}, transparent 10%)`,
                    animationDuration: speed
                }}
            ></div>
            <div className="relative z-1 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-white text-center rounded-[20px] p-4">
                {children}
            </div>
        </Component>
    );
};

export default StarBorder;
