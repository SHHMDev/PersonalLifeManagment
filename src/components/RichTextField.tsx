import { useState } from 'react';

type RichTextFieldProps = { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

export function RichTextField({ label, value, onChange, placeholder = 'توضیحات...', rows = 3 }: RichTextFieldProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="rich-text-field-wrapper">
      <label className="rich-text-label">{label}</label>
      <div className={`rich-text-container ${isFocused ? 'focused' : ''} ${isHovered ? 'hovered' : ''}`}>
        <textarea
          className="rich-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          placeholder={placeholder}
          rows={rows}
        />
      </div>
      <style>{`
        .rich-text-field-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .rich-text-label {
          font-size: 14px;
          font-weight: 500;
          color: #1b1f23;
          letter-spacing: -0.2px;
        }

        .rich-text-container {
          border-radius: 12px;
          border: 1.5px solid #e4e6eb;
          background-color: #ffffff;
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .rich-text-container.hovered {
          border-color: #c0c4cc;
        }

        .rich-text-container.focused {
          border-color: #1877f2;
          box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1);
        }

        .rich-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px 14px;
          font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          font-size: 15px;
          line-height: 1.5;
          color: #1b1f23;
          background-color: transparent;
          border: none;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
        }

        .rich-textarea::placeholder {
          color: #a0a4ab;
          font-weight: 400;
        }

        .rich-textarea:disabled {
          background-color: #f0f2f5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}