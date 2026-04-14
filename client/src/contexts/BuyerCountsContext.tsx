import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getBuyerCounts, BuyerCounts } from '@/services/buyerService';

interface BuyerCountsContextType {
  counts: BuyerCounts;
  localCounts: BuyerCounts;
  refreshCounts: () => Promise<void>;
  resetCount: (key: keyof BuyerCounts) => void;
  isLoading: boolean;
}

const BuyerCountsContext = createContext<BuyerCountsContextType | undefined>(undefined);

export function BuyerCountsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<BuyerCounts>({
    messages: 0,
    orders: 0,
    support: 0,
    billing: 0,
    refunds: 0,
  });
  
  const [localCounts, setLocalCounts] = useState<BuyerCounts>({
    messages: 0,
    orders: 0,
    support: 0,
    billing: 0,
    refunds: 0,
  });
  
  // Track baseline counts when pages are visited (to calculate new items since visit)
  // Persist in localStorage to survive page refreshes
  const loadVisitBaselines = (): Partial<Record<keyof BuyerCounts, number>> => {
    try {
      const stored = localStorage.getItem('buyer_visit_baselines');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading visit baselines:', e);
    }
    return {};
  };

  const saveVisitBaselines = (baselines: Partial<Record<keyof BuyerCounts, number>>) => {
    try {
      localStorage.setItem('buyer_visit_baselines', JSON.stringify(baselines));
    } catch (e) {
      console.error('Error saving visit baselines:', e);
    }
  };

  const [visitBaselines, setVisitBaselines] = useState<Partial<Record<keyof BuyerCounts, number>>>(loadVisitBaselines);
  
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  const refreshCounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const newCounts = await getBuyerCounts();
      // Always update counts from backend (they are the source of truth)
      setCounts(newCounts);
      // Local counts will be updated by the useEffect that watches counts and visitBaselines
    } catch (error) {
      console.error('Error refreshing buyer counts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetCount = useCallback(async (key: keyof BuyerCounts) => {
    // First, ensure we have the latest counts
    const latestCounts = await getBuyerCounts();
    setCounts(latestCounts);
    
    // Set baseline to current backend count when page is visited
    const newBaselines = {
      ...visitBaselines,
      [key]: latestCounts[key],
    };
    setVisitBaselines(newBaselines);
    saveVisitBaselines(newBaselines); // Persist to localStorage
    
    // Reset local count to 0
    setLocalCounts(prev => ({
      ...prev,
      [key]: 0,
    }));
  }, [visitBaselines]);

  // Reset count when user visits the corresponding page
  useEffect(() => {
    const path = location.pathname;
    const resetCountForKey = async (key: keyof BuyerCounts) => {
      await resetCount(key);
    };
    
    if (path === '/buyer/messages') {
      resetCountForKey('messages');
    } else if (path === '/buyer/orders') {
      resetCountForKey('orders');
    } else if (path === '/buyer/support') {
      resetCountForKey('support');
    } else if (path === '/buyer/billing') {
      resetCountForKey('billing');
    } else if (path === '/buyer/refund-requests') {
      resetCountForKey('refunds');
    }
  }, [location.pathname, resetCount]);

  // Initial load: Apply baselines to localCounts immediately after counts are fetched
  useEffect(() => {
    // When counts are first loaded, immediately apply baselines
    if (Object.keys(counts).some(k => counts[k as keyof BuyerCounts] > 0)) {
      setLocalCounts(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        Object.keys(counts).forEach(key => {
          const k = key as keyof BuyerCounts;
          const baseline = visitBaselines[k];
          if (baseline !== undefined) {
            // Page has been visited - show only new items since visit
            const newItems = Math.max(0, counts[k] - baseline);
            if (updated[k] !== newItems) {
              updated[k] = newItems;
              hasChanges = true;
            }
          } else {
            // Page hasn't been visited - show all items (only if increased)
            if (counts[k] > prev[k]) {
              updated[k] = counts[k];
              hasChanges = true;
            }
          }
        });
        return hasChanges ? updated : prev;
      });
    }
  }, [counts, visitBaselines]);

  // Fetch counts on mount and periodically
  useEffect(() => {
    refreshCounts();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(refreshCounts, 30000);
    
    // Listen for custom event to refresh counts immediately (e.g., when messages/orders arrive)
    const handleRefreshCounts = () => {
      refreshCounts();
    };
    window.addEventListener('refresh_counts', handleRefreshCounts);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh_counts', handleRefreshCounts);
    };
  }, [refreshCounts]);

  return (
    <BuyerCountsContext.Provider
      value={{
        counts,
        localCounts,
        refreshCounts,
        resetCount,
        isLoading,
      }}
    >
      {children}
    </BuyerCountsContext.Provider>
  );
}

export function useBuyerCounts() {
  const context = useContext(BuyerCountsContext);
  if (context === undefined) {
    throw new Error('useBuyerCounts must be used within a BuyerCountsProvider');
  }
  return context;
}

