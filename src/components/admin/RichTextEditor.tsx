import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Eraser,
  Palette,
} from "lucide-react";

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function RichTextEditor({ label, value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML || "");
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    if (command === "foreColor") {
      document.execCommand("styleWithCSS", false, "true");
    }
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitChange();
  };

  const addLink = () => {
    const input = window.prompt("Enter URL (https://...)");
    if (!input) return;
    const href = input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`;
    runCommand("createLink", href);
  };

  const openColorPicker = () => {
    saveSelection();
    colorInputRef.current?.click();
  };

  const applyColor = (color: string) => {
    if (!color) return;
    runCommand("foreColor", color);
  };

  const insertListFallback = (type: "ul" | "ol") => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const text = selection.toString().trim();
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      runCommand(type === "ul" ? "insertUnorderedList" : "insertOrderedList");
      return;
    }

    const listItems = lines.map((line) => `<li>${line.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] || char))}</li>`).join("");
    runCommand("insertHTML", `<${type}>${listItems}</${type}>`);
  };

  const buttons = [
    { title: "Bold", icon: Bold, action: () => runCommand("bold") },
    { title: "Italic", icon: Italic, action: () => runCommand("italic") },
    { title: "Underline", icon: Underline, action: () => runCommand("underline") },
    { title: "Heading 2", icon: Heading2, action: () => runCommand("formatBlock", "<h2>") },
    { title: "Heading 3", icon: Heading3, action: () => runCommand("formatBlock", "<h3>") },
    { title: "Bullet List", icon: List, action: () => insertListFallback("ul") },
    { title: "Numbered List", icon: ListOrdered, action: () => insertListFallback("ol") },
    { title: "Quote", icon: Quote, action: () => runCommand("formatBlock", "<blockquote>") },
    { title: "Link", icon: Link2, action: addLink },
    { title: "Text Color", icon: Palette, action: openColorPicker },
    { title: "Clear Format", icon: Eraser, action: () => runCommand("removeFormat") },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 border border-gray-300 rounded-md overflow-hidden bg-white">
        <div className="border-b border-gray-200 bg-gray-50 p-2 flex flex-wrap gap-1">
          {buttons.map(({ title, icon: Icon, action }) => (
            <button
              key={title}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={action}
              className="inline-flex items-center justify-center w-8 h-8 rounded border border-gray-200 bg-white text-gray-600 hover:text-[#eb5c10] hover:border-[#eb5c10] transition-colors"
              title={title}
              aria-label={title}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <input
            ref={colorInputRef}
            type="color"
            defaultValue="#10275c"
            className="hidden"
            onChange={(e) => applyColor(e.target.value)}
          />
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onInput={emitChange}
          onBlur={() => {
            saveSelection();
            emitChange();
          }}
          className="min-h-[220px] p-3 focus:outline-none text-sm leading-6 text-gray-700 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#eb5c10] [&_blockquote]:pl-3 [&_blockquote]:italic"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">Use the toolbar for formatted product description. This content is shown in the product Description tab.</p>
    </div>
  );
}
