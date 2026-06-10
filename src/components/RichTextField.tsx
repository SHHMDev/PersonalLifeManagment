import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type RichTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function RichTextField({
  label,
  value,
  onChange
}: RichTextFieldProps): JSX.Element {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    }
  });

  useEffect(() => {
    if (!editor) return;

    const current = editor.getHTML();

    if (current !== value) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  return (
    <div>
      <label className="label">{label}</label>

      <div className="rich-text-field">
        <div className="toolbar">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            Bold
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            Italic
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            Bullet
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            Ordered
          </button>
        </div>

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}