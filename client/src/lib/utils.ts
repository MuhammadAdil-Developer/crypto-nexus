import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateBTCAddress(address: string): boolean {
  if (!address) return true;

  // Strip bitcoin: prefix if present
  let cleanAddress = address;
  if (cleanAddress.toLowerCase().startsWith('bitcoin:')) {
    cleanAddress = cleanAddress.substring(8).split('?')[0];
  }

  // Legacy (1...) and P2SH (3...): 26-35 chars, base58
  const legacyP2SHRegex = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;
  // Segwit (bc1...): bech32 chars, variable length
  const bech32Regex = /^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,71}$/;

  return legacyP2SHRegex.test(cleanAddress) || bech32Regex.test(cleanAddress);
}

export function validateXMRAddress(address: string): boolean {
  if (!address) return true;

  // Strip monero: prefix if present
  let cleanAddress = address;
  if (cleanAddress.toLowerCase().startsWith('monero:')) {
    cleanAddress = cleanAddress.substring(7).split('?')[0];
  }

  // Monero addresses are usually 95 or 106 characters
  // We allow 4 (Mainnet), 8 (Subaddress), 5 (Stagenet), 9 (Testnet)
  const xmrRegex = /^[4589][a-zA-Z0-9]{94,110}$/;

  return xmrRegex.test(cleanAddress);
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
