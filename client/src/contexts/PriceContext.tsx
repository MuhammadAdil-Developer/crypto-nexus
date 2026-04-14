import React, { createContext, useContext, useState, useEffect } from 'react';
import { CRYPTO_PRICES, refreshCryptoPrices } from '@/lib/priceUtils';

interface PriceContextType {
    btc: number;
    xmr: number;
    refresh: () => Promise<void>;
    loading: boolean;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: React.ReactNode }) {
    const [prices, setPrices] = useState({ btc: CRYPTO_PRICES.BTC, xmr: CRYPTO_PRICES.XMR });
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            await refreshCryptoPrices();
            setPrices({ btc: CRYPTO_PRICES.BTC, xmr: CRYPTO_PRICES.XMR });
        } catch (error) {
            console.error('Failed to refresh prices in context:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 5 * 60 * 1000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    return (
        <PriceContext.Provider value={{ ...prices, refresh, loading }}>
            {children}
        </PriceContext.Provider>
    );
}

export function useCryptoPrices() {
    const context = useContext(PriceContext);
    if (context === undefined) {
        throw new Error('useCryptoPrices must be used within a PriceProvider');
    }
    return context;
}
