export function KwitansiBaris({
  label,
  nilai,
  menjorok,
}: {
  label: string;
  nilai: React.ReactNode;
  menjorok?: boolean;
}) {
  return (
    <div className={"kwt-baris" + (menjorok ? " kwt-menjorok" : "")}>
      <span>{label}</span>
      <span>:</span>
      <span className="kwt-nilai">{nilai}</span>
    </div>
  );
}
