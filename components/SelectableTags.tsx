import React from 'react';

interface SelectableTagsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  disabled?: boolean;
}

const SelectableTags: React.FC<SelectableTagsProps> = ({ options, selected, onSelect, disabled = false }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
            selected === option
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300'
          } ${
            disabled 
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-600'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default SelectableTags;
