// Calcoli del conto e stato del tavolo. Funzioni pure: nessun accesso a DOM o store.
// Tutti gli importi sono centesimi interi.

/** Importo di una riga. */
export const importoRiga = (r) => r.prezzoCent * r.qta;

/** Somma delle righe (senza coperto). */
export function totaleRighe(righe) {
  return righe.reduce((s, r) => s + importoRiga(r), 0);
}

/** Totale del servizio = Σ righe + prezzo coperto × numero coperti. */
export function totaleServizio(servizio, prezzoCopertoCent = 0) {
  return totaleRighe(servizio.righe) + prezzoCopertoCent * servizio.coperti.length;
}

/**
 * Divide `importo` in `n` parti intere. Il resto va 1 centesimo alla volta
 * alle prime parti, quindi la somma è sempre esattamente `importo`.
 *   ripartisci(1000, 3) → [334, 333, 333]
 */
export function ripartisci(importo, n) {
  if (!Number.isInteger(importo)) throw new TypeError('Importo non intero');
  if (!Number.isInteger(n) || n < 1) throw new RangeError('Numero di parti non valido');
  const segno = importo < 0 ? -1 : 1;
  const assoluto = Math.abs(importo);
  const base = Math.floor(assoluto / n);
  const resto = assoluto - base * n;
  return Array.from({ length: n }, (_, i) => segno * (base + (i < resto ? 1 : 0)));
}

/**
 * Normalizza la destinazione di una riga rispetto ai coperti esistenti.
 * Coperti inesistenti vengono ignorati; una divisione con un solo coperto
 * diventa di quel coperto, senza coperti diventa del tavolo.
 * Gli id della divisione sono ordinati come i coperti del servizio.
 */
export function destinazioneEffettiva(dest, coperti) {
  const ordine = coperti.map((c) => c.id);
  if (dest?.tipo === 'coperto') {
    return ordine.includes(dest.copertoId) ? dest : { tipo: 'tavolo' };
  }
  if (dest?.tipo === 'diviso') {
    const ids = ordine.filter((id) => dest.copertoIds.includes(id));
    if (ids.length === 0) return { tipo: 'tavolo' };
    if (ids.length === 1) return { tipo: 'coperto', copertoId: ids[0] };
    return { tipo: 'diviso', copertoIds: ids };
  }
  return { tipo: 'tavolo' };
}

/**
 * Conto per coperto. Per ogni persona:
 *   propri  = righe assegnate a lei
 *   quote   = sua parte delle righe divise + sua parte delle righe del tavolo
 *   coperto = prezzo del coperto
 * Le righe del tavolo vengono sommate e divise una volta sola tra tutti, così
 * il centesimo di resto non finisce sempre sulle stesse persone per ogni riga.
 * Garanzia: Σ totale persone === totaleServizio().
 */
export function contoPerCoperto(servizio, prezzoCopertoCent = 0) {
  const { coperti, righe } = servizio;
  const persone = coperti.map((c) => ({
    copertoId: c.id,
    etichetta: c.etichetta,
    pagato: !!c.pagato,
    propriCent: 0,
    quoteCent: 0,
    copertoCent: prezzoCopertoCent,
    totaleCent: 0,
    voci: []        // { rigaId, nome, qta, tipo: 'proprio'|'diviso'|'tavolo', parti, importoCent }
  }));
  if (persone.length === 0) return persone;
  const indice = new Map(persone.map((p, i) => [p.copertoId, i]));

  const righeTavolo = [];
  for (const r of righe) {
    const dest = destinazioneEffettiva(r.destinazione, coperti);
    const importo = importoRiga(r);
    if (dest.tipo === 'coperto') {
      const p = persone[indice.get(dest.copertoId)];
      p.propriCent += importo;
      p.voci.push({ rigaId: r.id, nome: r.nome, qta: r.qta, tipo: 'proprio', parti: 1, importoCent: importo });
    } else if (dest.tipo === 'diviso') {
      const parti = ripartisci(importo, dest.copertoIds.length);
      dest.copertoIds.forEach((id, i) => {
        const p = persone[indice.get(id)];
        p.quoteCent += parti[i];
        p.voci.push({ rigaId: r.id, nome: r.nome, qta: r.qta, tipo: 'diviso', parti: parti.length, importoCent: parti[i] });
      });
    } else {
      righeTavolo.push(r);
    }
  }

  if (righeTavolo.length) {
    const parti = ripartisci(totaleRighe(righeTavolo), persone.length);
    persone.forEach((p, i) => {
      p.quoteCent += parti[i];
      // Voci informative: quota di ogni riga del tavolo (arrotondata per difetto/eccesso nel totale)
      p.voci.push({ rigaId: null, nome: 'Quota del tavolo', qta: 1, tipo: 'tavolo', parti: persone.length, importoCent: parti[i] });
    });
  }

  for (const p of persone) p.totaleCent = p.propriCent + p.quoteCent + p.copertoCent;
  return persone;
}

/** Alla romana: quote intere che sommano al totale. */
export function contoAllaRomana(totaleCent, persone) {
  return ripartisci(totaleCent, Math.max(1, persone));
}

export const personeRomana = (servizio) => servizio.personeRomana || servizio.coperti.length || 1;

/** Stato derivato del tavolo: "libero" | "conto" | "attesa" | "occupato". */
export function statoTavolo(servizio) {
  if (!servizio) return 'libero';
  if (servizio.contoRichiesto) return 'conto';
  if (servizio.righe.some((r) => r.stato === 'chiamata')) return 'attesa';
  return 'occupato';
}

/**
 * Si può chiudere il tavolo?
 * - modalità "coperto": tutti i coperti pagati
 * - modalità "romana": pagamenti ≥ persone
 * - modalità "totale": sì, ma con conferma esplicita (richiedeConferma)
 */
export function puoChiudere(servizio) {
  const modalita = servizio.modalitaConto || 'totale';
  if (modalita === 'coperto') {
    const pagati = servizio.coperti.filter((c) => c.pagato).length;
    return { ok: pagati === servizio.coperti.length, richiedeConferma: false, pagati, totali: servizio.coperti.length };
  }
  if (modalita === 'romana') {
    const persone = personeRomana(servizio);
    const pagati = Math.min(servizio.pagamentiRomana || 0, persone);
    return { ok: pagati >= persone, richiedeConferma: false, pagati, totali: persone };
  }
  return { ok: true, richiedeConferma: true, pagati: 0, totali: 1 };
}
