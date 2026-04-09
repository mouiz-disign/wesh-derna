"use client";

import { useState, useRef, useCallback } from "react";
import {
  Plus,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  Code,
  Quote,
  Minus,
  GripVertical,
  Trash2,
} from "lucide-react";

interface Block {
  id: string;
  type: "paragraph" | "heading1" | "heading2" | "heading3" | "bullet" | "todo" | "code" | "quote" | "divider";
  content: string;
  checked?: boolean;
}

interface Props {
  content: any[];
  onChange: (content: Block[]) => void;
}

const blockTypes = [
  { type: "paragraph", icon: Type, label: "Texte" },
  { type: "heading1", icon: Heading1, label: "Titre 1" },
  { type: "heading2", icon: Heading2, label: "Titre 2" },
  { type: "heading3", icon: Heading3, label: "Titre 3" },
  { type: "bullet", icon: List, label: "Liste" },
  { type: "todo", icon: ListChecks, label: "Checklist" },
  { type: "code", icon: Code, label: "Code" },
  { type: "quote", icon: Quote, label: "Citation" },
  { type: "divider", icon: Minus, label: "Separateur" },
];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function BlockEditor({ content, onChange }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(
    content.length > 0
      ? (content as Block[])
      : [{ id: makeId(), type: "paragraph", content: "" }],
  );
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const update = useCallback(
    (newBlocks: Block[]) => {
      setBlocks(newBlocks);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => onChange(newBlocks), 800);
    },
    [onChange],
  );

  const updateBlock = (id: string, updates: Partial<Block>) => {
    update(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const addBlock = (afterId: string, type: Block["type"] = "paragraph") => {
    const idx = blocks.findIndex((b) => b.id === afterId);
    const newBlock: Block = { id: makeId(), type, content: "" };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    update(newBlocks);
    setShowMenu(null);
    // Focus new block
    setTimeout(() => {
      document.getElementById(`block-${newBlock.id}`)?.focus();
    }, 50);
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return;
    update(blocks.filter((b) => b.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent, block: Block) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      addBlock(block.id);
    }
    if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
      const idx = blocks.findIndex((b) => b.id === block.id);
      if (idx > 0) {
        setTimeout(() => {
          document.getElementById(`block-${blocks[idx - 1]!.id}`)?.focus();
        }, 50);
      }
    }
    if (e.key === "/" && block.content === "") {
      setShowMenu(block.id);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {blocks.map((block) => (
        <div key={block.id} className="group relative flex items-start gap-1">
          {/* Grip + add */}
          <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => addBlock(block.id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button className="rounded p-0.5 text-muted-foreground hover:bg-muted cursor-grab">
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Block content */}
          <div className="flex-1 min-w-0">
            {block.type === "divider" ? (
              <hr className="my-3 border-border" />
            ) : block.type === "todo" ? (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={block.checked || false}
                  onChange={(e) =>
                    updateBlock(block.id, { checked: e.target.checked })
                  }
                  className="mt-1.5 h-4 w-4 rounded"
                />
                <BlockInput
                  block={block}
                  onUpdate={(content) => updateBlock(block.id, { content })}
                  onKeyDown={(e) => handleKeyDown(e, block)}
                  className={block.checked ? "line-through text-muted-foreground" : ""}
                />
              </div>
            ) : (
              <BlockInput
                block={block}
                onUpdate={(content) => updateBlock(block.id, { content })}
                onKeyDown={(e) => handleKeyDown(e, block)}
              />
            )}

            {/* Slash menu */}
            {showMenu === block.id && (
              <div className="absolute left-8 top-8 z-50 w-56 rounded-lg border bg-popover p-1 shadow-lg">
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => {
                      updateBlock(block.id, { type: bt.type as Block["type"] });
                      setShowMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <bt.icon className="h-4 w-4 text-muted-foreground" />
                    {bt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => deleteBlock(block.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive transition-opacity mt-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Placeholder for empty page */}
      {blocks.length === 1 && blocks[0]!.content === "" && (
        <p className="pl-10 text-sm text-muted-foreground pointer-events-none">
          Tapez / pour les commandes, ou commencez a ecrire...
        </p>
      )}
    </div>
  );
}

function BlockInput({
  block,
  onUpdate,
  onKeyDown,
  className,
}: {
  block: Block;
  onUpdate: (content: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string;
}) {
  const styles: Record<string, string> = {
    paragraph: "text-sm py-1",
    heading1: "text-2xl font-bold py-1",
    heading2: "text-xl font-semibold py-1",
    heading3: "text-lg font-medium py-1",
    bullet: "text-sm py-0.5 pl-4 before:content-['•'] before:absolute before:left-0 before:text-muted-foreground relative",
    todo: "text-sm py-0.5",
    code: "font-mono text-sm bg-muted rounded-md px-3 py-2",
    quote: "text-sm italic border-l-2 border-primary pl-4 py-1",
  };

  if (block.type === "code") {
    return (
      <textarea
        id={`block-${block.id}`}
        value={block.content}
        onChange={(e) => onUpdate(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            onUpdate(block.content.slice(0, start) + "  " + block.content.slice(start));
          }
        }}
        placeholder="Code..."
        className={`w-full resize-none bg-muted rounded-md px-3 py-2 font-mono text-sm outline-none min-h-[60px] ${className || ""}`}
        rows={Math.max(block.content.split("\n").length, 2)}
      />
    );
  }

  return (
    <div
      id={`block-${block.id}`}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onUpdate(e.currentTarget.textContent || "")}
      onKeyDown={onKeyDown}
      className={`w-full outline-none ${styles[block.type] || styles.paragraph} ${className || ""}`}
      data-placeholder={
        block.type === "heading1"
          ? "Titre 1"
          : block.type === "heading2"
            ? "Titre 2"
            : block.type === "heading3"
              ? "Titre 3"
              : ""
      }
    >
      {block.content}
    </div>
  );
}
