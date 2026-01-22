import {Persona} from "./personas.model";
import {CsvToPersonas} from "./csv-to-personas";
import csv from "./data.csv?raw"

export const personas: Persona[] = [];

personas.push(new Persona("Gabriel", "Student", "CSUSM", "1234567890", "vian003@csusm.edu"));

console.log('Loaded', csv)
personas.push(...CsvToPersonas(csv));
