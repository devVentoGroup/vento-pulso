"use server";

import { awardExternalLoyaltyPoints } from "../api/loyalty-award.api";
import type { AwardPointsInput, AwardPointsResult } from "../types";

export async function awardLoyaltyPointsAction(
  input: AwardPointsInput
): Promise<AwardPointsResult> {
  return awardExternalLoyaltyPoints(input);
}
