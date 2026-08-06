/** Enveloppe chaque mot arabe dans un <span class="qw"> sans casser les balises tajwîd. */
export function wrapWords(html: string): string {
  return html.replace(/(?:<[^>]+>|[^\s<]+)+/g, (m) => `<span class="qw">${m}</span>`);
}
