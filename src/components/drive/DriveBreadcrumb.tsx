import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import type { DriveItem } from "@/lib/googleDrive";

/** Breadcrumb isi folder; segmen pertama selalu root dan tidak bisa naik di atasnya. */
export function DriveBreadcrumb({ path, onGo }: { path: DriveItem[]; onGo: (index: number) => void }) {
  if (path.length === 0) return null;
  return (
    <nav aria-label="Lokasi folder" className="flex flex-wrap items-center gap-1 text-xl text-muted-foreground">
      {path.map((folder, index) => {
        const last = index === path.length - 1;
        return (
          <Fragment key={folder.id}>
            {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden />}
            {last ? (
              <span aria-current="page" className="max-w-[16rem] truncate font-medium text-foreground">
                {folder.name}
              </span>
            ) : (
              <button
                type="button"
                className="max-w-[16rem] truncate rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={() => onGo(index)}
              >
                {folder.name}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
