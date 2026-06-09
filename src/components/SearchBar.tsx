type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function SearchBar({ value, onChange, placeholder }: SearchBarProps): JSX.Element {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}
