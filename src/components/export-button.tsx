export function ExportButton({
  resource,
  query,
  label = "Excel'e aktar",
}: {
  resource: string;
  query?: Record<string, string>;
  label?: string;
}) {
  const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  return (
    <a href={`/api/export/${resource}${qs}`} className="btn-secondary" download>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M10 2a1 1 0 0 1 1 1v7.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V3a1 1 0 0 1 1-1Z" />
        <path d="M3 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
      </svg>
      {label}
    </a>
  );
}
