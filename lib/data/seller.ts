// Sample identities for the demo: the signed-in user, the seller and its reps.
// A production build reads these from the CRM's user and team records.
import seller from "./seller.json";

export type Person = { name: string; email: string };

export const company: { name: string; emailDomain: string; mailboxExternalId: string } = seller.company;
export const user: Person = seller.user;
export const reps: Person[] = seller.reps;
export const team: Person[] = [user, ...reps];
export const domainKey = company.emailDomain.split(".")[0];
