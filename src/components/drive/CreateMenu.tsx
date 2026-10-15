import { FileSpreadsheet, FileText, FolderPlus, Folders, Plus, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GoogleDocKind } from "@/lib/googleDrive";

const FILE_OPTIONS: Array<{ kind: GoogleDocKind; label: string; icon: typeof FileText }> = [
  { kind: "document", label: "Google Docs", icon: FileText },
  { kind: "spreadsheet", label: "Google Sheets", icon: FileSpreadsheet },
  { kind: "presentation", label: "Google Slides", icon: Presentation },
];

/** Menu pembuatan gabungan: folder (satu/banyak) dan file Google kosong. */
export function CreateMenu({
  disabled,
  onNewFolder,
  onNewFolders,
  onNewFile,
}: {
  disabled?: boolean;
  onNewFolder: () => void;
  onNewFolders: () => void;
  onNewFile: (kind: GoogleDocKind) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={<Button variant="outline" aria-label="Buat baru" title="Buat folder atau file baru" />}
      >
        <Plus />
        Buat baru
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onNewFolder}>
          <FolderPlus />
          Folder baru
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewFolders}>
          <Folders />
          Banyak folder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>File Google</DropdownMenuLabel>
          {FILE_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.kind} onClick={() => onNewFile(opt.kind)}>
              <opt.icon />
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
