/**
 * Reinigungs-Bündel-Algorithmus
 *
 * Pro Abreise wird ein „Reinigungs-Slot" mit Zeitfenster [earliest, latest]
 * erzeugt. earliest = Abreisetag, latest = nächste Anreise − bufferDays
 * (bzw. earliest + maxLeadDays falls keine Anreise im Zeitraum).
 *
 * Greedy-Clustering sortiert nach `latest` aufsteigend und versucht jeden Slot
 * in ein bestehendes Cluster zu legen, dessen Tag im Slot-Fenster liegt.
 * Sonst wird ein neues Cluster mit `clusterDay = slot.latest` (= so spät wie
 * möglich) eröffnet.
 *
 * Reagiert dynamisch: bei jedem Page-Load neu berechnet.
 */

export interface CleaningSlotInput {
  apartmentId: string;
  apartmentName: string;
  bookingId: string;
  guestFirstName: string;
  guestLastName: string;
  checkOut: string; // YYYY-MM-DD = earliest
  /** Anreise + Gast der nächsten Buchung in diesem Apartment (nullable) */
  nextCheckIn: string | null;
  nextGuestFirstName: string | null;
  nextGuestLastName: string | null;
  /** Belegung der nächsten Buchung — relevant für Bettenplanung */
  nextAdults?: number;
  nextChildren?: number;
  nextInfants?: number;
  nextDogs?: number;
}

export interface CleaningSlot extends CleaningSlotInput {
  earliest: string; // = checkOut
  latest: string; // = nextCheckIn − bufferDays (oder earliest + maxLeadDays)
  isTurnover: boolean; // earliest === latest (gleicher Tag)
}

export interface CleaningCluster {
  /** Empfohlener Reinigungstag (YYYY-MM-DD) */
  day: string;
  /** Alle Slots, die an diesem Tag erledigt werden sollen */
  slots: CleaningSlot[];
  /** Mind. ein Same-Day-Wechsel im Cluster */
  hasTurnover: boolean;
}

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Wandelt rohe Slot-Inputs in CleaningSlots mit berechnetem Zeitfenster.
 */
export function buildCleaningSlots(
  inputs: CleaningSlotInput[],
  config: { buffer_days: number; max_lead_days: number }
): CleaningSlot[] {
  return inputs.map((input) => {
    const earliest = input.checkOut;
    let latest: string;
    if (input.nextCheckIn) {
      // bufferDays Tage vor nächster Anreise
      const candidate = addDaysIso(input.nextCheckIn, -config.buffer_days);
      // Nicht früher als earliest
      latest = candidate < earliest ? earliest : candidate;
    } else {
      // Keine nächste Anreise: Cap mit max_lead_days
      latest = addDaysIso(earliest, config.max_lead_days);
    }
    return {
      ...input,
      earliest,
      latest,
      isTurnover: earliest === latest,
    };
  });
}

/**
 * Greedy-Clustering: bündelt Slots zu möglichst wenigen Reinigungstagen.
 */
export function computeCleaningClusters(
  slots: CleaningSlot[]
): CleaningCluster[] {
  // 1. Sortiere nach `latest` aufsteigend (dringende zuerst)
  //    Tie-Break nach `earliest` aufsteigend → enge Fenster zuerst
  const sorted = [...slots].sort((a, b) => {
    const cmp = a.latest.localeCompare(b.latest);
    return cmp !== 0 ? cmp : a.earliest.localeCompare(b.earliest);
  });

  const clusters: CleaningCluster[] = [];

  for (const slot of sorted) {
    // 2. Suche bestehendes Cluster, in dessen Tag der Slot reinpasst
    const existing = clusters.find(
      (c) => slot.earliest <= c.day && c.day <= slot.latest
    );
    if (existing) {
      existing.slots.push(slot);
      if (slot.isTurnover) existing.hasTurnover = true;
    } else {
      clusters.push({
        day: slot.latest,
        slots: [slot],
        hasTurnover: slot.isTurnover,
      });
    }
  }

  // 3. Cluster nach Tag aufsteigend zurückgeben
  return clusters.sort((a, b) => a.day.localeCompare(b.day));
}
