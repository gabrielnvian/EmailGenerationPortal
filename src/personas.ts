import {Persona} from "./personas.model";
import {CsvToPersonas} from "./csv-to-personas";
import csv from "./data.csv?raw"
import {type Writable, writable} from "svelte/store";

export const personas: Writable<Persona[]> = writable(CsvToPersonas(csv));
