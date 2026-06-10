type CategoryChip = {
  id: number;
  title: string;
};

type CategoryChipsProps = {
  categories: CategoryChip[];
  selectedCategoryId: number;
  onSelect: (categoryId: number) => void;
};

export function CategoryChips({ categories, selectedCategoryId, onSelect }: CategoryChipsProps): JSX.Element {
  return (
    <div className="chips-row">
      <button className={`chip ${selectedCategoryId === 0 ? 'chip-active' : ''}`} onClick={() => onSelect(0)} type="button">
        همه
      </button>
      {categories.map((category) => (
        <button
          className={`chip ${selectedCategoryId === category.id ? 'chip-active' : ''}`}
          key={category.id}
          onClick={() => onSelect(category.id)}
          type="button"
        >
          {category.title}
        </button>
      ))}
    </div>
  );
}
