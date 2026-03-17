"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

type MentionUser = { id: string; name: string };

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  users,
  placeholder,
  rows = 2,
  className = "",
  onKeyDown,
  disabled,
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build options: @channel + filtered users
  const channelOption = { id: "__channel__", name: "channel" };
  const filteredUsers = query
    ? users.filter((u) =>
        u.name.toLowerCase().includes(query.toLowerCase())
      )
    : users;
  const options = [
    ...(query === "" || "channel".includes(query.toLowerCase()) ? [channelOption] : []),
    ...filteredUsers,
  ].slice(0, 8);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      onChange(newValue);

      // Detect if we're in a mention context
      const textBefore = newValue.slice(0, cursorPos);
      const atMatch = textBefore.match(/@(\w*)$/);

      if (atMatch) {
        setMentionStart(cursorPos - atMatch[0].length);
        setQuery(atMatch[1]);
        setShowDropdown(true);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
        setMentionStart(null);
      }
    },
    [onChange]
  );

  const insertMention = useCallback(
    (option: MentionUser) => {
      if (mentionStart === null) return;
      const textarea = textareaRef.current;
      const cursorPos = textarea?.selectionStart || value.length;

      const before = value.slice(0, mentionStart);
      const after = value.slice(cursorPos);
      const mentionText = option.id === "__channel__" ? "@channel" : `@${option.name}`;
      const newValue = `${before}${mentionText} ${after}`;

      onChange(newValue);
      setShowDropdown(false);
      setMentionStart(null);
      setQuery("");

      // Restore focus and cursor position
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus();
          const pos = before.length + mentionText.length + 1;
          textarea.setSelectionRange(pos, pos);
        }
      });
    },
    [mentionStart, value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (showDropdown && options.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % options.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + options.length) % options.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          insertMention(options[selectedIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowDropdown(false);
          return;
        }
      }
      onKeyDown?.(e);
    },
    [showDropdown, options, selectedIndex, insertMention, onKeyDown]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />

      {showDropdown && options.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-64 max-h-56 overflow-y-auto rounded-lg border bg-popover shadow-lg z-50"
        >
          <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Mention someone
          </div>
          {options.map((option, i) => (
            <button
              key={option.id}
              type="button"
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(option);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {option.id === "__channel__" ? (
                <>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Users className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-medium">@channel</span>
                    <span className="text-xs text-muted-foreground ml-1.5">Notify everyone</span>
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px]">
                      {option.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span>{option.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
