export function toUsd(valueAtTarget: number, usdTargetForArgon: number): number {
  return valueAtTarget * usdTargetForArgon;
}

export function toTargetUnits(usd: number, usdTargetForArgon: number): number {
  return usd / usdTargetForArgon;
}

export function validateTarget(usdTargetForArgon: number): void {
  if (!Number.isFinite(usdTargetForArgon) || usdTargetForArgon <= 0) {
    throw new Error('Argon USD target must be a positive finite number');
  }
}
