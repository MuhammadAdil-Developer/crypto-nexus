import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateBTCAddress(address: string): boolean {
  if (!address) return true;
  // Legacy (1...) and P2SH (3...): 26-35 chars, base58
  const legacyP2SHRegex = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;
  // Segwit (bc1...): bech32 chars, variable length
  const bech32Regex = /^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$/;

  return legacyP2SHRegex.test(address) || bech32Regex.test(address);
}

export function validateXMRAddress(address: string): boolean {
  if (!address) return true;
  // Standard: 95 chars, starts with 4
  // Integrated: 106 chars, starts with 4
  // Subaddress: 95 chars, starts with 8
  const xmrRegex = /^[48][1-9A-HJ-NP-Za-km-z]{94,105}$/;

  return xmrRegex.test(address);
}
export function formatCryptoAmountInString(text: string): string {
  if (!text) return text;

  // Regex to find numbers followed by BTC or XMR
  // It handles numbers like 0.00001112408921519550586795706102
  const cryptoRegex = /(\d+\.\d{8,})\s*(BTC|XMR)/g;

  return text.replace(cryptoRegex, (match, amount, currency) => {
    try {
      const formattedAmount = parseFloat(amount).toFixed(8);
      // Remove trailing zeros if any (optional, but cleaner)
      const cleanAmount = parseFloat(formattedAmount).toString();
      // Ensure we still have a reasonable number of decimals if it was very small
      const finalAmount = cleanAmount.includes('.') ? cleanAmount : formattedAmount;
      return `${finalAmount} ${currency}`;
    } catch (e) {
      return match;
    }
  });
}
