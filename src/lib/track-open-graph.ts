export interface TrackOpenGraphLicense {
  enabled: boolean;
  termsText?: string;
  price: {
    amount: number;
    currency: string;
  };
}

export interface TrackOpenGraphInput {
  title: string;
  producerName?: string | null;
  genre: string;
  bpm: number;
  coverUrl?: string | null;
  licenses: TrackOpenGraphLicense[];
}

export interface TrackOpenGraphData extends TrackOpenGraphInput {
  producerLabel: string;
  priceLabel: string;
}

export function buildTrackOpenGraphData(
  input: TrackOpenGraphInput
): TrackOpenGraphData {
  const lowestLicense = input.licenses.reduce<
    TrackOpenGraphLicense | undefined
  >((lowest, license) => {
    if (
      !license.enabled ||
      license.price.currency !== "INR" ||
      !license.termsText?.trim()
    ) {
      return lowest;
    }
    return !lowest || license.price.amount < lowest.price.amount
      ? license
      : lowest;
  }, undefined);

  const priceLabel = lowestLicense
    ? lowestLicense.price.amount === 0
      ? "Free"
      : `INR ${new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(lowestLicense.price.amount / 100)}`
    : "No active license";

  return {
    ...input,
    producerLabel: input.producerName?.trim() || "Producer name not listed",
    priceLabel,
  };
}
