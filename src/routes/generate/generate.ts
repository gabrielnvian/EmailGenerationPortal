/**
 * Set up an API with n8n so that we can create a database record containing
 * the field and the company selected by the user, as well as the number of emails to be generated.
 * The n8n workflow is going to run on database trigger,
 * decreasing the number of emails to be generated at every iteration
 */
import {Persona} from "../../personas.model";

export async function queueEmails(field: string, idea: string, personas: Persona[], n: number) {
  const url = "http://localhost:5678/webhook-test/ea07a640-6fbe-4334-939c-fec4c2eada89";

  const request = new Request(url, {
    method: "POST",
    body: JSON.stringify({
      "field": field,
      "idea": idea,
      "personas": personas.toString(),
      "emailCount": n
    })
  });

  const response = await fetch(request);
  const json = await response.json();
  console.log(json);
}
