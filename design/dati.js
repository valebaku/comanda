// Dati di esempio condivisi dai mockup
export const ALLERGENI = [
  ['GL','Glutine'],['CR','Crostacei'],['UO','Uova'],['PE','Pesce'],['AR','Arachidi'],['SO','Soia'],['LA','Latte'],
  ['FG','Frutta a guscio'],['SD','Sedano'],['SN','Senape'],['SE','Sesamo'],['SF','Solfiti'],['LU','Lupini'],['MO','Molluschi']
];

export const STATI = {
  free:   { bg:'var(--color-surface)', fg:'var(--color-text-muted)', bc:'var(--status-free)', bs:'dashed', icon:'event_available', txt:'Libero' },
  open:   { bg:'var(--status-open)', fg:'var(--color-text)', bc:'var(--color-primary)', bs:'solid', icon:'schedule', txt:'Aperto' },
  active: { bg:'var(--status-active)', fg:'var(--color-on-primary)', bc:'var(--status-active)', bs:'solid', icon:'restaurant', txt:'In corso' },
  held:   { bg:'var(--status-held)', fg:'#1D1A16', bc:'var(--status-held)', bs:'solid', icon:'pause_circle', txt:'In attesa' },
  bill:   { bg:'var(--status-bill)', fg:'var(--color-on-primary)', bc:'var(--status-bill)', bs:'solid', icon:'receipt_long', txt:'Conto' }
};

export const TAVOLI = [
  { lab:'T1', st:'free', cop:2, sh:'round', x:14, y:14, w:84, h:84 },
  { lab:'T2', st:'active', cop:2, tm:'38′', sh:'round', x:137, y:14, w:84, h:84 },
  { lab:'T3', st:'open', cop:4, tm:'6′', alg:true, sh:'square', x:256, y:12, w:88, h:88 },
  { lab:'T4', st:'held', cop:4, tm:'55′', sh:'square', x:12, y:132, w:88, h:88 },
  { lab:'T5', st:'active', cop:6, tm:'1h12′', alg:true, sh:'rect', x:134, y:132, w:210, h:88 },
  { lab:'T6', st:'bill', cop:6, tm:'1h40′', sh:'rect', x:12, y:250, w:210, h:88 },
  { lab:'T7', st:'active', cop:4, tm:'22′', sh:'square', x:256, y:250, w:88, h:88 },
  { lab:'T8', st:'free', cop:2, sh:'round', x:14, y:370, w:84, h:84 },
  { lab:'T9', st:'free', cop:2, sh:'round', x:137, y:370, w:84, h:84 },
  { lab:'T10', st:'open', cop:2, tm:'3′', sh:'round', x:258, y:370, w:84, h:84 }
];

export function tavoliView(scale = 1, ox = 0, oy = 0) {
  return TAVOLI.map(t => {
    const s = STATI[t.st];
    return {
      ...t, ...s,
      x: ox + t.x * scale, y: oy + t.y * scale, w: t.w * scale, h: t.h * scale,
      r: t.sh === 'round' ? '50%' : 'var(--radius-md)',
      meta: t.st === 'free' ? `${t.cop} posti` : `${t.cop} · ${t.tm}`,
      alg: !!t.alg, lfs: Math.round(20 * Math.max(1, scale * 0.9))
    };
  });
}

export const POSTI_T5 = [
  { l:'P1', g:'Luca', n:3 }, { l:'P2', g:'Giulia', a:true, n:2 }, { l:'P3', n:2 },
  { l:'P4', g:'Anna', a:true, n:1 }, { l:'P5', n:1 }, { l:'P6', g:'Marta', n:0 }
];

const L = {
  draft:  { st:'Bozza', sti:'edit', stc:'var(--color-text-muted)', bs:'dashed', bc:'var(--color-text-muted)', td:'none', col:'var(--color-text)' },
  sent:   { st:'Inviata', sti:'send', stc:'var(--color-info)', bs:'solid', bc:'var(--color-border)', td:'none', col:'var(--color-text)' },
  served: { st:'Servita', sti:'check_circle', stc:'var(--color-success)', bs:'solid', bc:'var(--color-border)', td:'none', col:'var(--color-text)' },
  void:   { st:'Stornata', sti:'block', stc:'var(--color-danger)', bs:'solid', bc:'var(--color-border)', td:'line-through', col:'var(--color-text-muted)' }
};
const A = {
  seat: (p) => ({ ai:'person', at:p }),
  shared: (n) => ({ ai:'group', at:'×' + n }),
  table: () => ({ ai:'table_restaurant', at:'Tavolo' })
};

export const ORDINE = [
  { name:'Antipasti', info:'Servita · 21:02', icon:'check_circle', col:'var(--color-success)', lines:[
    { q:1, name:'Tagliere toscano', price:'18,00', seats:['T'], ...A.table(), ...L.served },
    { q:2, name:'Bruschette al pomodoro', sub:'Condiviso: P1, P3', price:'9,00', seats:['P1','P3'], ...A.shared(2), ...L.served }
  ]},
  { name:'Primi', info:'Inviata · da marciare', icon:'pause_circle', col:'var(--color-warning)', lines:[
    { q:1, name:'Tagliatelle al ragù', price:'13,00', seats:['P1'], ...A.seat('P1'), ...L.sent },
    { q:1, name:'Risotto ai funghi', sub:'Senza burro · allergia segnalata', alg:true, price:'14,00', seats:['P2'], ...A.seat('P2'), ...L.sent },
    { q:1, name:'Gnocchi al pomodoro', price:'12,00', seats:['P4'], ...A.seat('P4'), ...L.sent },
    { q:1, name:'Calice Chianti', sub:'Storno: errore di inserimento', price:'6,00', seats:['P3'], ...A.seat('P3'), ...L.void }
  ]},
  { name:'Secondi', info:'Bozza · non inviata', icon:'edit_note', col:'var(--color-text-muted)', lines:[
    { q:1, name:'Tagliata di manzo', sub:'Cottura: al sangue · + Rucola 1,50', price:'23,50', seats:['P1'], ...A.seat('P1'), ...L.draft },
    { q:1, name:'Branzino al forno', price:'21,00', seats:['P5'], ...A.seat('P5'), ...L.draft },
    { q:2, name:'Acqua naturale 75 cl', price:'6,00', seats:['T'], ...A.table(), ...L.draft }
  ]}
];

export function ordineFiltrato(f) {
  return ORDINE.map(g => ({
    ...g,
    lines: g.lines.filter(l => f === 'Tutti' || l.seats.includes(f === 'Tavolo' ? 'T' : f)).map(l => ({ ...l, hasSub: !!l.sub, alg: !!l.alg }))
  })).filter(g => g.lines.length);
}

export const PIATTI_PRIMI = [
  { name:'Tagliatelle al ragù', desc:'Pasta all\u2019uovo, ragù di manzo e maiale', price:'13,00', al:['GL','UO','SD'] },
  { name:'Risotto ai funghi porcini', desc:'Carnaroli, porcini, parmigiano', price:'14,00', al:['LA'] },
  { name:'Spaghetti alle vongole', desc:'Vongole veraci, aglio, prezzemolo', price:'15,00', al:['GL','MO'] },
  { name:'Pici cacio e pepe', desc:'Pecorino romano, pepe nero', price:'12,00', al:['GL','LA'], out:true },
  { name:'Gnocchi al pomodoro', desc:'Senza glutine, basilico fresco', price:'12,00', al:[] },
  { name:'Zuppa di legumi', desc:'Ceci, cicerchie, farro a parte', price:'11,00', al:['SD'] }
];

export function piattiView(allergieOspite) {
  const names = Object.fromEntries(ALLERGENI);
  return PIATTI_PRIMI.map(p => {
    const hit = p.al.filter(a => allergieOspite.includes(a));
    return {
      ...p, out: !!p.out, ok: !p.out,
      conflict: hit.length > 0 && !p.out,
      conflictTxt: 'Contiene ' + hit.map(h => names[h]).join(', '),
      tags: p.al.map(a => ({ c:a, bg: hit.includes(a) ? 'var(--status-allergen)' : 'transparent', fg: hit.includes(a) ? '#fff' : 'var(--color-text-muted)', bc: hit.includes(a) ? 'var(--status-allergen)' : 'var(--color-border)' })),
      hasTags: p.al.length > 0, op: p.out ? 0.5 : 1
    };
  });
}

export const CONTO_POSTI = [
  { l:'P1', g:'Luca', righe:4, tot:'38,50', st:'Pagato', sti:'check_circle', stc:'var(--color-success)', paid:true },
  { l:'P2', g:'Giulia', righe:5, tot:'29,00', st:'Da pagare', sti:'radio_button_unchecked', stc:'var(--color-text-muted)', open:true, items:[
    ['Risotto ai funghi','14,00'],['Patate al forno','3,50'],['Tagliere toscano · quota 1/6','3,00'],['Acqua naturale · quota 1/6','1,00'],['Calice Vermentino','5,00'],['Coperto','2,50']
  ]},
  { l:'P3', g:'', righe:3, tot:'24,00', st:'Da pagare', sti:'radio_button_unchecked', stc:'var(--color-text-muted)' },
  { l:'P4', g:'Anna', righe:3, tot:'33,00', st:'Parziale · 20,00', sti:'timelapse', stc:'var(--color-warning)' },
  { l:'P5', g:'', righe:3, tot:'27,50', st:'Da pagare', sti:'radio_button_unchecked', stc:'var(--color-text-muted)' },
  { l:'P6', g:'Marta', righe:2, tot:'24,00', st:'Da pagare', sti:'radio_button_unchecked', stc:'var(--color-text-muted)' }
].map(p => ({ ...p, open: !!p.open, paid: !!p.paid, hasG: !!p.g, items: (p.items || []).map(([n, v]) => ({ n, v })) }));
