import { SelectHTMLAttributes } from 'react';

type Option = {
  value: string | number;
  label: string;
};

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Option[];
};

export function SelectField({ label, id, options, ...rest }: SelectFieldProps): JSX.Element {
  const fieldId = id ?? label;
  return (
    <div>
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <select id={fieldId} {...rest}>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
