import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => {
  return (
    <img
      src="/logo.jpg"
      alt="BroCode Logo"
      className={`${className} rounded-full object-cover`}
    />
  );
};

export default Logo;