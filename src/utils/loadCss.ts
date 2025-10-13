export function loadCss(url: string, id?: string): void {
  if (typeof document === 'undefined') return;

  // Prefer id if provided to avoid duplicates
  if (id && document.getElementById(id)) return;

  // Avoid adding duplicate href links
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  const existing = links.some((l) => l.href === url || (id && l.id === id));
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  if (id) link.id = id;
  document.head.appendChild(link);
}
