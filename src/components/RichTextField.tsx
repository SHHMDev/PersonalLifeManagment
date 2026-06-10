import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type RichTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const modules = {
  toolbar: [['bold', 'italic'], [{ list: 'bullet' }, { list: 'ordered' }], ['clean']],
  clipboard: {
    matchVisual: false
  }
};

const formats = ['bold', 'italic', 'list', 'bullet'];

export function RichTextField({ label, value, onChange }: RichTextFieldProps): JSX.Element {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="rich-text-field">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          preserveWhitespace
        />
      </div>
    </div>
  );
}
