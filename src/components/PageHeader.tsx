type PageHeaderProps = {
  title: string;
  subtitle: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps): JSX.Element {
  return (
    <header>
      <h1 className="page-header">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </header>
  );
}
