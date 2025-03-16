import React from 'react';

const DottedBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main dot pattern with animation */}
      <div 
        className="absolute inset-0 animate-float-slow"
        style={{ 
          transformOrigin: 'center',
          backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.2) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          transform: 'perspective(1000px) rotateX(60deg)'
        }}
      />
      
      {/* Secondary dot pattern with offset and different animation */}
      <div 
        className="absolute inset-0 animate-float-slower"
        style={{ 
          transformOrigin: 'center',
          backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '15px 15px',
          transform: 'perspective(1000px) rotateX(60deg)'
        }}
      />
    </div>
  );
};

export default DottedBackground;
