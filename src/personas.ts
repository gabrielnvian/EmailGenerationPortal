import {Persona} from "./personas.model";
import {CsvToPersonas} from "./csv-to-personas";
import csv from "./data.csv?raw"
import {readable} from "svelte/store";

export const personas = readable<Persona[]>(CsvToPersonas(csv));
