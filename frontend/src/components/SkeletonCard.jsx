import React from 'react';
import SkeletonLoader from './SkeletonLoader.jsx';

export const SkeletonCard = ({ lines = 3, showFooter = false }) => {
  const cardStyle = {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '0.5px solid rgba(242, 237, 230, 0.08)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(8px)'
  };

  return (
    <div style={cardStyle}>
      <SkeletonLoader width="40%" height="24px" marginBottom="16px" />
      
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader 
          key={index} 
          width={index === lines - 1 ? '80%' : '100%'} 
          height="16px" 
          marginBottom="12px" 
        />
      ))}
      
      {showFooter && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(242, 237, 230, 0.08)' }}>
          <SkeletonLoader width="30%" height="16px" marginBottom="0" />
        </div>
      )}
    </div>
  );
};

export default SkeletonCard;
