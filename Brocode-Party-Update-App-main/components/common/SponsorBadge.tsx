import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface SponsorBadgeProps {
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    animate?: boolean;
    count?: number;
}

const SIZES = { sm: 16, md: 20, lg: 28 };

const SponsorBadge: React.FC<SponsorBadgeProps> = ({
    size = 'sm',
    showLabel = false,
    animate = true,
    count,
}) => {
    const px = SIZES[size];

    return (
        <motion.span
            className="inline-flex items-center gap-1 cursor-default"
            title={count ? `Sponsored ${count} spot${count > 1 ? 's' : ''}` : 'Sponsor'}
            initial={animate ? { scale: 0 } : undefined}
            animate={animate ? { scale: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
            <span
                className="relative inline-flex items-center justify-center"
                style={{ width: px, height: px }}
            >
                {/* Glow */}
                <span
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, rgba(250,204,21,0.4) 0%, transparent 70%)',
                    }}
                />
                {/* Shimmer overlay */}
                <span
                    className="absolute inset-0 overflow-hidden rounded-full"
                    style={{
                        background:
                            'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                        animation: animate ? 'sponsor-shimmer 2s ease-in-out infinite' : 'none',
                    }}
                />
                <Star
                    size={px * 0.8}
                    className="relative z-10 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.6)]"
                />
            </span>
            {showLabel && (
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                    Sponsor{count && count > 1 ? ` ×${count}` : ''}
                </span>
            )}

            {/* Inject keyframes once */}
            <style>{`
        @keyframes sponsor-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
        </motion.span>
    );
};

export default SponsorBadge;
