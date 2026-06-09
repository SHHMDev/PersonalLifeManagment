import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = 'primary', ...rest }: ButtonProps): JSX.Element {
  const className = `btn ${variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary'} ${
    rest.className ?? ''
  }`.trim();
  return <button {...rest} className={className} />;
}
