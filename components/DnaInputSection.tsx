import React from 'react';

interface DnaInputSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  titleExtra?: React.ReactNode;
}

const DnaInputSection: React.FC<DnaInputSectionProps> = ({ title, description, children, titleExtra }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">{title}</h2>
        {titleExtra}
      </div>
      <p className="text-sm text-gray-400 mb-2">{description}</p>
      {children}
    </div>
  );
};

export default DnaInputSection;
