import React, { useEffect, useRef } from 'react';
import { Box, IconButton, Divider, SxProps, Theme, Tooltip } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table as TableExtension } from '@tiptap/extension-table';
import { TableRow as TableRowExtension } from '@tiptap/extension-table-row';
import { TableCell as TableCellExtension } from '@tiptap/extension-table-cell';
import { TableHeader as TableHeaderExtension } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';

const ResizableImage = Image.extend({
  group: 'block',
  inline: false,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; height: auto; display: block;`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height'),
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
});

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: number;
  showToolbar?: boolean;
  sx?: SxProps<Theme>;
};

const editorContentSx = (minHeight: number): SxProps<Theme> => ({
  '& .tiptap': {
    minHeight,
    outline: 'none',
    px: 1.5,
    py: 1.25,
    fontSize: '0.875rem',
    lineHeight: 1.6,
    '& p': { margin: '0.35em 0' },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: '12px auto',
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      margin: '8px 0',
    },
    '& td, & th': {
      border: '1px solid #C5CED9',
      padding: '6px 8px',
      minWidth: 48,
    },
  },
  '& .ProseMirror-focused': { outline: 'none' },
});

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder,
  minHeight = 160,
  showToolbar = true,
  sx,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'resizable-image',
          style: 'display: block; margin: 12px auto; max-width: 100%; clear: both;',
        },
      }),
      TableExtension.configure({ resizable: true }),
      TableRowExtension,
      TableHeaderExtension,
      TableCellExtension,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
        defaultAlignment: 'left',
      }),
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
      handlePaste: (_view, event) => {
        const ed = editorRef.current;
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file && ed) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const result = e.target?.result as string;
                  if (result) ed.chain().focus().setImage({ src: result }).run();
                };
                reader.readAsDataURL(file);
              }
              return true;
            }
          }
        }

        const htmlData = event.clipboardData?.getData('text/html');
        const textData = event.clipboardData?.getData('text/plain');

        if (htmlData && htmlData.includes('<table') && ed) {
          event.preventDefault();
          ed.chain().focus().insertContent(htmlData).run();
          return true;
        }

        if (textData && textData.includes('\t') && ed) {
          event.preventDefault();
          const lines = textData.split('\n').filter((line) => line.trim());
          if (lines.length > 0) {
            const rows = lines.map((line) => line.split('\t').map((cell) => cell.trim()));
            const maxCols = Math.max(...rows.map((row) => row.length), 1);
            let tableHTML = '<table><tbody>';
            rows.forEach((row) => {
              tableHTML += '<tr>';
              for (let i = 0; i < maxCols; i++) {
                tableHTML += `<td>${row[i] || ''}</td>`;
              }
              tableHTML += '</tr>';
            });
            tableHTML += '</tbody></table>';
            ed.chain().focus().insertContent(tableHTML).run();
            return true;
          }
        }

        return false;
      },
    },
  });

  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current) {
      editor.commands.setContent(next);
    }
  }, [editor, value]);

  const handleImagePick = (file: File | undefined) => {
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) editor.chain().focus().setImage({ src: result }).run();
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box
      sx={{
        border: '1px solid #C5CED9',
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: '#fff',
        ...sx,
      }}
    >
      {showToolbar && !readOnly && editor && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 0.25,
            px: 0.5,
            py: 0.5,
            borderBottom: '1px solid #C5CED9',
            bgcolor: '#F5F7FA',
          }}
        >
          <ToolbarBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
            <FormatBold fontSize="small" />
          </ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <FormatItalic fontSize="small" />
          </ToolbarBtn>
          <ToolbarBtn title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <FormatUnderlined fontSize="small" />
          </ToolbarBtn>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <ToolbarBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <FormatListBulleted fontSize="small" />
          </ToolbarBtn>
          <ToolbarBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <FormatListNumbered fontSize="small" />
          </ToolbarBtn>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <ToolbarBtn title="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <FormatAlignLeft fontSize="small" />
          </ToolbarBtn>
          <ToolbarBtn title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <FormatAlignCenter fontSize="small" />
          </ToolbarBtn>
          <ToolbarBtn title="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <FormatAlignRight fontSize="small" />
          </ToolbarBtn>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
          <ToolbarBtn title="Insert image" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon fontSize="small" />
          </ToolbarBtn>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleImagePick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Box>
      )}
      <Box
        sx={{
          ...editorContentSx(minHeight),
          ...(placeholder
            ? {
                '& .tiptap p.is-editor-empty:first-child::before': {
                  content: 'attr(data-placeholder)',
                  color: 'text.disabled',
                  float: 'left',
                  height: 0,
                  pointerEvents: 'none',
                },
              }
            : {}),
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

function ToolbarBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <IconButton size="small" onClick={onClick} sx={{ borderRadius: 0 }}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

export default RichTextEditor;
