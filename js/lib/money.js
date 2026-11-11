// Importi sempre in centesimi interi. Qui solo formattazione e parsing.

const fmt = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });

/** 1300 → "13,00" */
export function formatCent(cent) {
  if (!Number.isInteger(cent)) throw new TypeError(`Importo non intero: ${cent}`);
  return fmt.format(cent / 100);
}

/** 123450 → "€ 1.234,50" */
export function formatEuro(cent) {
  return `€ ${formatCent(cent)}`;
}

/**
 * Converte un testo digitato dall'utente in centesimi.
 * Accetta "13", "13,5", "13,50", "13.50", "1.234,50", "€ 2,00". Ritorna null se non valido.
 */
export function parseCent(testo) {
  if (typeof testo === 'number') testo = String(testo);
  if (typeof testo !== 'string') return null;
  let s = testo.replace(/€|\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // formato italiano
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [intera, dec = ''] = s.split('.');
  return Number(intera) * 100 + Number((dec + '00').slice(0, 2));
}
