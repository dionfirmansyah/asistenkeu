import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function Barcode({ teks }: { teks: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        JsBarcode(ref.current, teks, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          height: 40,
        });
        ref.current.setAttribute("preserveAspectRatio", "none");
      } catch {
        /* biarkan kosong bila barcode gagal */
      }
    }
  }, [teks]);
  return (
    <div className="kwt-barcode-wrap" role="img" aria-label="Barcode nomor kwitansi">
      <svg ref={ref} className="kwt-barcode" />
    </div>
  );
}
