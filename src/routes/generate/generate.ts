/**
 * Set up an API with n8n so that we can create a database record containing
 * the field and the company selected by the user, as well as the number of emails to be generated.
 * The n8n workflow is going to run on database trigger,
 * decreasing the number of emails to be generated at every iteration
 */
import {Persona} from "../../personas.model";

export async function queueEmails(fromField: string, toField: string, idea: string, fromPersonas: Persona[], toPersonas: Persona[], n: number) {
  const url = "https://n8n.tail068f9.ts.net/webhook-test/generate-email";

  const response = await fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "fromField": fromField,
      "toField": toField,
      "idea": idea,
      "from": fromPersonas.map(persona => JSON.stringify(persona)),
      "to": toPersonas.map(persona => JSON.stringify(persona)),
      "emailCount": n
    })
  });
}
