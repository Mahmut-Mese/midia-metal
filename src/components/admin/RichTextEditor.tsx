import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ImagePlus,
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
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
};

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_SIZE_LABEL = "2MB";

export default function RichTextEditor({ label, value, onChange, helperText = "Saved as formatted HTML." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const getSafeInsertionRange = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor) return null;

    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      return selectionRef.current.cloneRange();
    }

    if (selection.rangeCount > 0) {
      const liveRange = selection.getRangeAt(0);
      if (editor.contains(liveRange.commonAncestorContainer)) {
        return liveRange.cloneRange();
      }
    }

    const fallback = document.createRange();
    fallback.selectNodeContents(editor);
    fallback.collapse(false);
    return fallback;
  };

  const insertHtmlAtSelection = (html: string) => {
    editorRef.current?.focus();
    restoreSelection();

    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor) return;

    const range = getSafeInsertionRange();
    if (!range) return;

    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      selectionRef.current = newRange.cloneRange();
    }

    emitChange();
  };

  const setSelectionFromPoint = (x: number, y: number) => {
    const docWithCaret = document as Document & {
      caretRangeFromPoint?: (px: number, py: number) => Range | null;
      caretPositionFromPoint?: (px: number, py: number) => { offsetNode: Node; offset: number } | null;
    };

    if (docWithCaret.caretRangeFromPoint) {
      const range = docWithCaret.caretRangeFromPoint(x, y);
      if (range) {
        selectionRef.current = range.cloneRange();
        return;
      }
    }

    if (docWithCaret.caretPositionFromPoint) {
      const caret = docWithCaret.caretPositionFromPoint(x, y);
      if (caret) {
        const range = document.createRange();
        range.setStart(caret.offsetNode, caret.offset);
        range.collapse(true);
        selectionRef.current = range.cloneRange();
      }
    }
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await apiFetch("/admin/upload", {
      method: "POST",
      body: formData,
    });
    return response.url as string;
  };

  const insertUploadedImages = async (files: File[]) => {
    if (!files.length) return;

    const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversized) {
      toast.error(`"${oversized.name}" is too large. Max size is ${MAX_IMAGE_SIZE_LABEL}.`);
      return;
    }

    setIsUploading(true);
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        const alt = file.name.replace(/\.[^/.]+$/, "");
        const escapedSrc = String(url).replace(/"/g, "&quot;");
        const escapedAlt = alt.replace(/"/g, "&quot;");
        insertHtmlAtSelection(
          `<p><img src="${escapedSrc}" alt="${escapedAlt}" style="max-width:100%;height:auto;display:block;" /></p><p><br></p>`
        );
      }
      toast.success(files.length > 1 ? "Images uploaded" : "Image uploaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
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

  const openImagePicker = () => {
    editorRef.current?.focus();
    saveSelection();
    imageInputRef.current?.click();
  };

  const handleImagePickerChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      toast.error("Please choose image files only.");
      event.target.value = "";
      return;
    }

    await insertUploadedImages(files);
    event.target.value = "";
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
    editorRef.current?.focus();
    restoreSelection();
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
    insertHtmlAtSelection(`<${type}>${listItems}</${type}><p><br></p>`);
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
    { title: "Upload Image", icon: ImagePlus, action: openImagePicker },
    { title: "Text Color", icon: Palette, action: openColorPicker },
    { title: "Clear Format", icon: Eraser, action: () => runCommand("removeFormat") },
  ];

  return (
    <div>
      {label ? <label className="block text-sm font-medium text-gray-700">{label}</label> : null}
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
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImagePickerChange}
          />
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
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
            setSelectionFromPoint(event.clientX, event.clientY);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={async (event) => {
            event.preventDefault();
            setIsDragOver(false);

            const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
            if (!files.length) return;

            setSelectionFromPoint(event.clientX, event.clientY);
            await insertUploadedImages(files);
          }}
          onInput={emitChange}
          onBlur={() => {
            saveSelection();
            emitChange();
          }}
          className={`min-h-[220px] p-3 focus:outline-none text-sm leading-6 text-gray-700 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#eb5c10] [&_blockquote]:pl-3 [&_blockquote]:italic ${isDragOver ? "bg-[#fff7f2] ring-2 ring-[#eb5c10]/40" : ""}`}
        />
      </div>
      {helperText ? (
        <p className="mt-1 text-xs text-gray-500">
          {helperText} Drag and drop images into the editor, or use Upload Image. Max image size: {MAX_IMAGE_SIZE_LABEL}.
          {isUploading ? " Uploading..." : ""}
        </p>
      ) : null}
    </div>
  );
}
