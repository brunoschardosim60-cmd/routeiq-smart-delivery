import { useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { suggestAddresses, type AddressSuggestion } from "@/lib/geo.functions";
import { MapPin, Loader2 } from "lucide-react";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  iconColor?: string;
}

export function AddressInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  iconColor = "text-primary",
}: AddressInputProps) {
  const suggestFn = useServerFn(suggestAddresses);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipRef = useRef(false);

  const search = useCallback(
    (q: string) => {
      if (tRef.current) clearTimeout(tRef.current);
      if (q.trim().length < 3) {
        setItems([]);
        setOpen(false);
        return;
      }
      tRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const r = await suggestFn({ data: { query: q } });
          setItems(r.suggestions ?? []);
          setOpen((r.suggestions ?? []).length > 0);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
      }, 350);
    },
    [suggestFn],
  );

  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <MapPin className={`absolute left-2.5 top-2.5 h-4 w-4 ${iconColor}`} />
      {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      <input
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          if (skipRef.current) {
            skipRef.current = false;
            return;
          }
          search(e.target.value);
        }}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && items.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {items.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  skipRef.current = true;
                  onChange(s.address);
                  onSelect(s);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{s.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
