/**
 * Price Formatting Utilities
 * 
 * Rules:
 * 1. USD is the PRIMARY display currency (larger text)
 * 2. BTC/XMR are SECONDARY (smaller text)
 * 3. USD uses 2 decimal places ($10.00)
 * 4. BTC uses 8 decimal places (0.00010000)
 * 5. XMR uses 8 decimal places (0.00010000)
 */

// Current approximate crypto prices (should ideally come from API)
const CRYPTO_PRICES = {
    BTC: 100000, // $100,000 per BTC
    XMR: 200,    // $200 per XMR
};

/**
 * Format USD amount with 2 decimal places
 * @param amount - The USD amount
 * @returns Formatted string like "$10.00"
 */
export function formatUSD(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
}

/**
 * Format BTC amount with 8 decimal places
 * @param amount - The BTC amount
 * @returns Formatted string like "0.00010000 BTC"
 */
export function formatBTC(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 BTC';
    return `${parseFloat(num.toFixed(8))} BTC`;
}

/**
 * Format XMR amount with 8 decimal places
 * @param amount - The XMR amount
 * @returns Formatted string like "0.00010000 XMR"
 */
export function formatXMR(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 XMR';
    return `${parseFloat(num.toFixed(8))} XMR`;
}

/**
 * Convert USD to BTC
 * @param usd - USD amount
 * @param btcPrice - Current BTC price in USD (optional, defaults to CRYPTO_PRICES.BTC)
 * @returns BTC amount
 */
export function usdToBTC(usd: number | string, btcPrice?: number): number {
    const usdNum = typeof usd === 'string' ? parseFloat(usd) : usd;
    const price = btcPrice || CRYPTO_PRICES.BTC;
    if (isNaN(usdNum) || price === 0) return 0;
    return usdNum / price;
}

/**
 * Convert USD to XMR
 * @param usd - USD amount
 * @param xmrPrice - Current XMR price in USD (optional, defaults to CRYPTO_PRICES.XMR)
 * @returns XMR amount
 */
export function usdToXMR(usd: number | string, xmrPrice?: number): number {
    const usdNum = typeof usd === 'string' ? parseFloat(usd) : usd;
    const price = xmrPrice || CRYPTO_PRICES.XMR;
    if (isNaN(usdNum) || price === 0) return 0;
    return usdNum / price;
}

/**
 * Convert BTC to USD
 * @param btc - BTC amount
 * @param btcPrice - Current BTC price in USD (optional, defaults to CRYPTO_PRICES.BTC)
 * @returns USD amount
 */
export function btcToUSD(btc: number | string, btcPrice?: number): number {
    const btcNum = typeof btc === 'string' ? parseFloat(btc) : btc;
    const price = btcPrice || CRYPTO_PRICES.BTC;
    if (isNaN(btcNum)) return 0;
    return btcNum * price;
}

/**
 * Convert XMR to USD
 * @param xmr - XMR amount
 * @param xmrPrice - Current XMR price in USD (optional, defaults to CRYPTO_PRICES.XMR)
 * @returns USD amount
 */
export function xmrToUSD(xmr: number | string, xmrPrice?: number): number {
    const xmrNum = typeof xmr === 'string' ? parseFloat(xmr) : xmr;
    const price = xmrPrice || CRYPTO_PRICES.XMR;
    if (isNaN(xmrNum)) return 0;
    return xmrNum * price;
}

/**
 * Format price for display - USD as primary, crypto as secondary
 * @param usdAmount - Price in USD
 * @param showCrypto - Whether to show crypto equivalent
 * @param cryptoType - 'BTC' or 'XMR'
 * @returns Object with formatted USD and crypto strings
 */
export function formatPriceDisplay(
    usdAmount: number | string,
    showCrypto: boolean = true,
    cryptoType: 'BTC' | 'XMR' = 'BTC'
): { usd: string; crypto: string; cryptoAmount: number } {
    const usd = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
    const formattedUSD = formatUSD(usd);

    let cryptoAmount = 0;
    let formattedCrypto = '';

    if (showCrypto) {
        if (cryptoType === 'BTC') {
            cryptoAmount = usdToBTC(usd);
            formattedCrypto = formatBTC(cryptoAmount);
        } else {
            cryptoAmount = usdToXMR(usd);
            formattedCrypto = formatXMR(cryptoAmount);
        }
    }

    return {
        usd: formattedUSD,
        crypto: formattedCrypto,
        cryptoAmount,
    };
}

/**
 * Format product price - assumes price is stored in USD
 * @param price - Price value (assumed to be USD)
 * @returns Formatted USD string
 */
export function formatProductPrice(price: number | string | undefined | null): string {
    if (price === undefined || price === null) return '$0.00';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
}

/**
 * Parse price input and return clean number
 * @param input - User input price
 * @returns Parsed number with 2 decimal places
 */
export function parsePrice(input: string): number {
    // Remove any non-numeric characters except decimal point
    const cleaned = input.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return Math.round(num * 100) / 100; // Round to 2 decimal places
}

/**
 * Format crypto amount based on currency type
 * @param amount - The crypto amount
 * @param currency - 'BTC' or 'XMR'
 * @returns Formatted crypto string
 */
export function formatCryptoAmount(amount: number | string, currency: 'BTC' | 'XMR'): string {
    if (currency === 'BTC') {
        return formatBTC(amount);
    }
    return formatXMR(amount);
}

// Export crypto prices for use in components
export { CRYPTO_PRICES };
