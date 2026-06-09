type EmptyStateProps = {
  text: string;
};

export function EmptyState({ text }: EmptyStateProps): JSX.Element {
  return <p className="empty">{text}</p>;
}
