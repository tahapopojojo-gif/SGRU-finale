import React, { useEffect } from 'react';

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { backgroundPosition: -1000px 0; }
    100% { backgroundPosition: 1000px 0; }
  }
`;

export const SkeletonLoader = ({ 
  width = '100%', 
  height = '16px', 
  borderRadius = '4px', 
  marginBottom = '12px' 
}) => {
  useEffect(() => {
    if (!document.querySelector('#shimmer-style')) {
      const style = document.createElement('style');
      style.id = 'shimmer-style';
      style.innerHTML = shimmerKeyframes;
      document.head.appendChild(style);
    }
  }, []);

  const skeletonStyle = {
    display: 'inline-block',
    width,
    height,
    marginBottom,
    background: 'linear-gradient(90deg, #E5E7EB 0%, #F3F4F6 50%, #E5E7EB 100%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 1.5s infinite linear',
    borderRadius
  };

  return <div style={skeletonStyle}></div>;
};

export default SkeletonLoader;
