/**
 * Cookie utilities for secure token storage
 * This provides httpOnly-like behavior by storing tokens in cookies
 * Note: For true httpOnly, cookies must be set by the server
 */

const TOKEN_COOKIE_NAME = 'ac_tokens';
const TOKEN_EXPIRY_DAYS = 6;

export const cookieUtils = {
  /**
   * Set tokens in cookies (client-side cookies - NOT httpOnly)
   * For true httpOnly, server must set the cookie
   */
  setTokens(accessToken: string, refreshToken: string): void {
    try {
      const tokenData = JSON.stringify({ access: accessToken, refresh: refreshToken });
      const expires = new Date();
      expires.setDate(expires.getDate() + TOKEN_EXPIRY_DAYS);

      // Set cookie with SameSite=Strict for security
      document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(tokenData)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    } catch (error) {
      console.error('Error setting token cookie:', error);
    }
  },

  /**
   * Get tokens from cookies
   */
  getTokens(): { access: string; refresh: string } | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === TOKEN_COOKIE_NAME) {
          return JSON.parse(decodeURIComponent(value));
        }
      }
      return null;
    } catch (error) {
      console.error('Error reading token cookie:', error);
      return null;
    }
  },

  /**
   * Clear token cookies (for logout)
   */
  clearTokens(): void {
    try {
      document.cookie = `${TOKEN_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    } catch (error) {
      console.error('Error clearing token cookie:', error);
    }
  },

  /**
   * Get access token (checks cookies first, then localStorage for backward compatibility)
   */
  getAccessToken(): string | null {
    // Try cookies first
    const tokens = this.getTokens();
    if (tokens?.access) {
      return tokens.access;
    }
    // Fallback to localStorage
    return localStorage.getItem('accessToken');
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    const tokens = this.getTokens();
    if (tokens?.refresh) {
      return tokens.refresh;
    }
    return localStorage.getItem('refreshToken');
  },

  /**
   * Save tokens to both cookies and localStorage (backward compatibility)
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    // Save to cookies
    this.setTokens(accessToken, refreshToken);
    // Also save to localStorage for backward compatibility
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  /**
   * Remove all token storage
   */
  removeTokens(): void {
    this.clearTokens();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export default cookieUtils;