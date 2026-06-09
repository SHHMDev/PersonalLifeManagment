import { TextareaHTMLAttributes } from 'react';

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function TextAreaField({ label, id, ...rest }: TextAreaFieldProps): JSX.Element {
  const fieldId = id ?? label;
  return (
    <div>
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea id={fieldId} {...rest} />
    </div>
  );
}
