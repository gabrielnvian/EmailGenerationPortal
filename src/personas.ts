import { readable, writable } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { Persona } from './personas.model';
import { CsvToPersonas } from './csv-to-personas';
import csv from './data.csv?raw';

type PersonasStore = Readable<Persona[]> & {
  reload: () => Promise<void>;
};

function createPersonasStore(): PersonasStore {
  const { subscribe, set } = writable<Persona[]>(CsvToPersonas(csv));

  return {
    subscribe,
    async reload() {
      const res = await fetch('./api/personas');

      if (!res.ok) {
        throw new Error('Failed to reload personas');
      }

      const data = await res.json();
      set(CsvToPersonas(data.csv));
    }
  };
}

export const personas = createPersonasStore();