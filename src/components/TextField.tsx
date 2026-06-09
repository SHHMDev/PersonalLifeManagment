import { InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextField({ label, id, ...rest }: TextFieldProps): JSX.Element {
  const fieldId = id ?? label;
  return (
    <div>
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <input id={fieldId} {...rest} />
    </div>
  );
}
