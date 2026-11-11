// Dati di esempio: 10 tavoli e un menu da trattoria, per provare l'app.

const id = () => globalThis.crypto.randomUUID();

export function applicaDatiEsempio(s) {
  const coperti = [2, 2, 4, 4, 4, 6, 6, 8, 2, 4];
  s.tavoli = coperti.map((c, i) => ({ id: id(), nome: String(i + 1), copertiDefault: c, ordine: i }));

  // uscitaDefault = indice in impostazioni.uscite (1ª, 2ª, 3ª, Dessert)
  const menu = [
    ['Antipasti', 0, [['Tagliere toscano', 1800], ['Bruschette al pomodoro', 600], ['Antipasto misto', 1400], ['Caprese', 900]]],
    ['Primi', 1, [['Tagliatelle al ragù', 1300], ['Spaghetti alla carbonara', 1200], ['Risotto ai funghi porcini', 1400], ['Gnocchi al pomodoro', 1100], ['Pici cacio e pepe', 1200]]],
    ['Secondi', 2, [['Tagliata di manzo', 2350], ['Branzino al forno', 2100], ['Pollo alla cacciatora', 1600], ['Parmigiana di melanzane', 1300]]],
    ['Contorni', 2, [['Patate al forno', 450], ['Insalata mista', 400], ['Verdure grigliate', 550]]],
    ['Dessert', 3, [['Tiramisù', 650], ['Panna cotta', 550], ['Cantucci e Vin Santo', 800], ['Sorbetto al limone', 500]]],
    ['Bevande', 0, [['Acqua naturale 75 cl', 250], ['Acqua frizzante 75 cl', 250], ['Coca-Cola', 350], ['Birra media', 550], ['Caffè', 150]]],
    ['Vini', 0, [['Calice Chianti', 600], ['Calice Vermentino', 550], ['Bottiglia Chianti Classico', 2400], ['Bottiglia Prosecco', 2200]]]
  ];
  s.categorie = [];
  s.piatti = [];
  menu.forEach(([nome, uscita, piatti], ordine) => {
    const cat = { id: id(), nome, ordine, uscitaDefault: Math.min(uscita, s.impostazioni.uscite.length - 1) };
    s.categorie.push(cat);
    for (const [n, p] of piatti) s.piatti.push({ id: id(), nome: n, categoriaId: cat.id, prezzoCent: p, attivo: true });
  });

  if (!s.impostazioni.nomeLocale) s.impostazioni.nomeLocale = 'Trattoria di prova';
  if (!s.impostazioni.prezzoCopertoCent) s.impostazioni.prezzoCopertoCent = 200;
}
