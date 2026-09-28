import { useEffect, useRef, useState } from "react";

const PREFIX = "odem-de-servico:draft:";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDraft<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return initial;

    const parsed = JSON.parse(raw) as unknown;

    // Objetos sao mesclados com o initial para nao quebrar quando o formulario
    // ganha campos novos; valores simples (texto, numero, boolean, lista) sao
    // usados como estao.
    if (isPlainObject(parsed) && isPlainObject(initial)) {
      return { ...initial, ...parsed } as T;
    }

    if (parsed === null || typeof parsed !== typeof initial) {
      return initial;
    }

    return parsed as T;
  } catch {
    return initial;
  }
}

/**
 * Like useState, but survives page reloads/tab discards by mirroring the value to
 * localStorage. O rascunho nao tem prazo de validade: o usuario pode voltar
 * horas ou dias depois que o que ele preencheu continua la. Call the returned
 * `clearDraft` after a successful save/submit so stale drafts don't reappear on
 * the next form open.
 */
export function usePersistedState<T>(key: string, initial: T, options?: { omit?: (keyof T)[] }) {
  const [value, setValue] = useState<T>(() => readDraft(key, initial));
  // Guardado em ref para o array poder ser criado inline pelo chamador sem
  // disparar gravacoes extras.
  const omitRef = useRef(options?.omit);
  omitRef.current = options?.omit;

  useEffect(() => {
    try {
      let toStore: unknown = value;

      // Campos sensiveis (senha, por exemplo) nunca vao para o localStorage.
      const omit = omitRef.current;
      if (omit?.length && isPlainObject(value)) {
        const copy = { ...value } as Record<string, unknown>;
        for (const field of omit) {
          delete copy[field as string];
        }
        toStore = copy;
      }

      localStorage.setItem(PREFIX + key, JSON.stringify(toStore));
    } catch {
      // storage unavailable (private mode, quota) - draft persistence is best-effort
    }
  }, [key, value]);

  function clearDraft(resetTo: T = initial) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
    setValue(resetTo);
  }

  return [value, setValue, clearDraft] as const;
}
