import { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function Card({ title, subtitle, children }: CardProps): JSX.Element {
  return (
    <section className="card">
      <h3 className="card-title">{title}</h3>
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
      <div>{children}</div>
    </section>
  );
}
