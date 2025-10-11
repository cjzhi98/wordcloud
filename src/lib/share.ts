export function slugifyTitle(title: string): string {
  return (title || 'session')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export function buildShareUrl(sessionId: string, title: string): string {
  const slug = slugifyTitle(title);
  const base = window.location.origin;
  return `${base}/#/join/${sessionId}/${slug}`;
}

