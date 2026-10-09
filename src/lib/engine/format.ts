const nf = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfInt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** Format angka id-ID dengan dua desimal: 1.234.567,00 */
export const nf0 = (n: number): string => nf.format(Number.isFinite(n) ? n : 0);
/** Format angka bulat (tanpa desimal) untuk jumlah/persen */
export const nfInt0 = (n: number): string => nfInt.format(Math.round(n || 0));
/** Format uang Rupiah: Rp 1.234.567,00 */
export const rp = (n: number): string => "Rp " + nf.format(Number.isFinite(n) ? n : 0);
/** Format uang dengan tanda minus eksplisit */
export const rpS = (n: number): string => (n < 0 ? "-Rp " : "Rp ") + nf.format(Math.abs(Number.isFinite(n) ? n : 0));
