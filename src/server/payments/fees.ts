import { siteConfig } from "@/config/site";

export function getPlatformFeePercent(): number {
  const feePercent = siteConfig.platformFeePercent;
  if (
    feePercent === null ||
    !Number.isInteger(feePercent) ||
    feePercent < 0 ||
    feePercent > 100
  ) {
    throw new Error(
      "PLATFORM_FEE_PERCENT must be configured as an integer from 0 to 100."
    );
  }
  return feePercent;
}
