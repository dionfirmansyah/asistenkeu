import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const groupInt = (digits: string) => (digits ? Number(digits).toLocaleString("id-ID") : "");

export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const fmt = (n: number) =>
    n
      ? n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : "";
  const [text, setText] = useState<string>(() => fmt(value));

  useEffect(() => {
    if (parseFloat(text.replace(/\./g, "").replace(",", ".")) !== value) {
      setText(fmt(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      value={text}
      onChange={(e) => {
        // Hanya digit, satu koma, dan titik dihapus (anggap titik sebagai pemisah ribuan)
        let s = e.target.value.replace(/[^\d,]/g, "");
        const firstComma = s.indexOf(",");
        if (firstComma >= 0) s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
        const [intRaw, decRaw] = s.split(",");
        const intDisp = groupInt(intRaw);
        const disp = decRaw !== undefined ? `${intDisp},${decRaw.slice(0, 2)}` : intDisp;
        setText(disp);
        const n = parseFloat(`${intRaw || "0"}.${decRaw ?? "0"}`);
        onChange(Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);
      }}
    />
  );
}
