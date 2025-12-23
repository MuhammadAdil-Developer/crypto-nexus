// Global order expiration service that runs regardless of current page
class OrderExpirationService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private expiredOrders: Set<string> = new Set();

  // Start monitoring an order for expiration
  startMonitoring(orderId: string, orderCreatedAt: string, onExpire: (orderId: string) => void) {
    // Clear existing interval for this order if any
    this.stopMonitoring(orderId);

    // Check if already expired
    if (this.expiredOrders.has(orderId)) {
      return;
    }

    const checkExpiration = () => {
      const orderCreatedAtTime = new Date(orderCreatedAt).getTime();
      const expiresAt = orderCreatedAtTime + (120 * 60 * 1000); // 2 hours
      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

      if (remainingSeconds === 0 && !this.expiredOrders.has(orderId)) {
        // Order expired
        this.expiredOrders.add(orderId);
        this.stopMonitoring(orderId);
        onExpire(orderId);
      }
    };

    // Check immediately
    checkExpiration();

    // Check every second
    const interval = setInterval(checkExpiration, 1000);
    this.intervals.set(orderId, interval);
  }

  // Stop monitoring an order
  stopMonitoring(orderId: string) {
    const interval = this.intervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(orderId);
    }
  }

  // Stop all monitoring
  stopAll() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }

  // Mark order as expired
  markExpired(orderId: string) {
    this.expiredOrders.add(orderId);
    this.stopMonitoring(orderId);
  }

  // Check if order is expired
  isExpired(orderId: string): boolean {
    return this.expiredOrders.has(orderId);
  }

  // Clear expired status (for testing or reset)
  clearExpired(orderId: string) {
    this.expiredOrders.delete(orderId);
  }
}

export const orderExpirationService = new OrderExpirationService();

