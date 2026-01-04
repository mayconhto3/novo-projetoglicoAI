// OS-16 UX: Custom Select Component
// Responsabilidade: Select dropdown customizado com design moderno
// Data: 2026-01-03
// Padrão: Clean, animated, accessible

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-wrapper">
      {label && <label className="select-label">{label}</label>}

      <div
        ref={selectRef}
        className={`custom-select ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="select-trigger">
          <span className={value ? 'selected-text' : 'placeholder-text'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown
            size={20}
            className={`chevron-icon ${isOpen ? 'rotated' : ''}`}
          />
        </div>

        {isOpen && (
          <div className="select-dropdown">
            {options.map((option) => (
              <div
                key={option.value}
                className={`select-option ${option.value === value ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={16} className="check-icon" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .custom-select-wrapper {
          width: 100%;
        }

        .select-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .custom-select {
          position: relative;
          width: 100%;
        }

        .select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .select-trigger:hover {
          border-color: #9ca3af;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
        }

        .custom-select.open .select-trigger {
          border-color: #029491;
          box-shadow: 0 0 0 3px rgba(2, 148, 145, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .selected-text {
          color: #111827;
          font-size: 15px;
        }

        .placeholder-text {
          color: #9ca3af;
          font-size: 15px;
        }

        .chevron-icon {
          color: #6b7280;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .chevron-icon.rotated {
          transform: rotate(180deg);
        }

        .select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #029491;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 240px;
          overflow-y: auto;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .select-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 15px;
          color: #374151;
        }

        .select-option:hover {
          background: rgba(2, 148, 145, 0.08);
        }

        .select-option.selected {
          background: rgba(2, 148, 145, 0.12);
          color: #029491;
          font-weight: 600;
        }

        .select-option:first-child {
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
        }

        .select-option:last-child {
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
        }

        .check-icon {
          color: #029491;
          animation: checkPop 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes checkPop {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Scrollbar customizada */
        .select-dropdown::-webkit-scrollbar {
          width: 6px;
        }

        .select-dropdown::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }

        .select-dropdown::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .select-dropdown::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        @media (max-width: 640px) {
          .select-trigger {
            padding: 10px 12px;
          }

          .select-option {
            padding: 10px 12px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};
