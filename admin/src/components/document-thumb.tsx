import { FileX } from "lucide-react";

export function DocumentThumb({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block overflow-hidden rounded-md border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="h-40 w-full object-cover transition-opacity group-hover:opacity-90"
          />
        </a>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground">
          <FileX className="h-6 w-6" />
          <span className="text-xs">Not uploaded</span>
        </div>
      )}
    </div>
  );
}
