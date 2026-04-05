'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ name, value, onChange, options, defaultValue, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value !== undefined ? value : defaultValue);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    setCurrentValue(val);
    setIsOpen(false);
    if (onChange) onChange({ target: { name, value: val } });
  };

  const selectedOpt = options.find(o => o.value === currentValue) || (currentValue === undefined && options[0]);

  return (
    <div ref={wrapperRef} className={`custom-select-wrapper ${isOpen ? 'open' : ''}`}>
      <input type="hidden" name={name} value={currentValue || ''} />
      
      <div 
        className={`form-input custom-select-trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
            if(e.key === 'Enter' || e.key === ' ') { 
              e.preventDefault(); 
              setIsOpen(!isOpen); 
            }
        }}
      >
        <span className={!selectedOpt ? 'text-muted' : ''}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </div>

      <div className={`custom-select-dropdown ${isOpen ? 'visible' : ''}`}>
        <div className="custom-select-options">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select-option ${currentValue === opt.value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
