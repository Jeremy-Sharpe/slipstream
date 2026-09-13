import type { ApiIcpProfile } from "./api/slipstream";

/** The sourcing brief the API derived from the won deals. */
export const briefFor = (profile: ApiIcpProfile) => profile.profile.origami_brief;

/** One sentence describing the customer the won deals point at. */
export const sentenceFor = (profile: ApiIcpProfile) => profile.profile.summary;
