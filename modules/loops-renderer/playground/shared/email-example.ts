import type { LoopsLmxAst, LoopsLmxVariables } from "@onderwijsin/loops-core";

/** A local sample email parsed on the server, ready for the public renderer. */
export interface EmailExample {
  subject: string;
  preheader: string;
  sender: string;
  recipient: string;
  ast: LoopsLmxAst;
  variables: LoopsLmxVariables;
}
