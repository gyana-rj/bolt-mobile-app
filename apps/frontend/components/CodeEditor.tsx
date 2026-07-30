"use client";

import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

const CODE_FONT = "var(--font-jetbrains-mono), ui-monospace, monospace";

function extensionsForPath(path: string) {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "ts":
      return [javascript({ typescript: true })];
    case "tsx":
      return [javascript({ typescript: true, jsx: true })];
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return [javascript({ jsx: ext === "jsx" })];
    case "json":
      return [json()];
    case "css":
    case "scss":
      return [css()];
    case "md":
      return [markdown()];
    default:
      return [];
  }
}

interface CodeEditorProps {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({
  path,
  value,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const extensions = useMemo(() => extensionsForPath(path), [path]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      className="h-full min-h-0 flex-1 overflow-hidden text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
      style={{ fontFamily: CODE_FONT, fontSize: "12px" }}
      theme="dark"
      extensions={extensions}
      editable={!readOnly}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        bracketMatching: true,
        autocompletion: true,
      }}
    />
  );
}
