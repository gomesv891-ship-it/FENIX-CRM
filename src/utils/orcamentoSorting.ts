import { SavedOrcamento } from '../types';

/**
 * Retorna o timestamp de milissegundos preciso da DATA DE CRIAÇÃO de um orçamento.
 * Prioridade:
 * 1. dataOrcamento (DD/MM/YYYY) combinada com a precisão de milissegundos de createdAt/savedAt/id
 * 2. createdAt / savedAt explícito (ISO string)
 * 3. Timestamp milissegundo embutido no id (ex: orc_1790689096094)
 * 4. Fallback updatedAt
 */
export function getOrcamentoCreationTimestamp(orc: SavedOrcamento): number {
  if (!orc) return 0;

  let day = 0;
  let month = 0;
  let year = 0;
  if (orc.dataOrcamento && typeof orc.dataOrcamento === 'string') {
    const clean = orc.dataOrcamento.replace(/\s*(às\s*)?\d{1,2}:\d{2}(:\d{2})?.*$/i, '').trim();
    const parts = clean.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  }

  let preciseTime = 0;
  if ((orc as any).createdAt) {
    const t = new Date((orc as any).createdAt).getTime();
    if (!isNaN(t) && t > 0) preciseTime = t;
  }
  if (!preciseTime && orc.savedAt) {
    const t = new Date(orc.savedAt).getTime();
    if (!isNaN(t) && t > 0) preciseTime = t;
  }
  if (!preciseTime && orc.id) {
    const m = String(orc.id).match(/(\d{12,14})/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > 1500000000000 && num < 2500000000000) {
        preciseTime = num;
      }
    }
  }

  if (year >= 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
    if (preciseTime > 0) {
      const pDate = new Date(preciseTime);
      if (pDate.getFullYear() === year && pDate.getMonth() + 1 === month && pDate.getDate() === day) {
        return preciseTime;
      }
      const timeOfDayMs = preciseTime % 86400000;
      return new Date(year, month - 1, day).getTime() + timeOfDayMs;
    }
    return new Date(year, month - 1, day, 12, 0, 0).getTime();
  }

  if (preciseTime > 0) return preciseTime;

  if (orc.updatedAt) {
    const t = new Date(orc.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  return 0;
}

/**
 * Ordena orçamentos do mais recente para o mais antigo com base na DATA DE CRIAÇÃO.
 * Desempata por ID de forma estável.
 */
export function compareOrcamentosByCreationDateDesc(a: SavedOrcamento, b: SavedOrcamento): number {
  const timeA = getOrcamentoCreationTimestamp(a);
  const timeB = getOrcamentoCreationTimestamp(b);

  if (timeB !== timeA) {
    return timeB - timeA;
  }

  const idA = String(a.id || '');
  const idB = String(b.id || '');
  return idB.localeCompare(idA);
}

/**
 * Formata a data de criação estritamente sem hora (apenas DD/MM/YYYY).
 */
export function formatOrcamentoCreationDate(dateVal?: string): string {
  if (!dateVal || !dateVal.trim()) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  }
  let str = dateVal.trim();
  if (str.includes('T')) {
    str = str.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  str = str.replace(/\s*(às\s*)?\d{1,2}:\d{2}(:\d{2})?.*$/i, '').trim();
  return str || dateVal;
}
