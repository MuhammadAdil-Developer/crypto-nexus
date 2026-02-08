import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          action?: string;
          cData?: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          appearance?: "always" | "execute" | "interaction-only";
          retry?: "auto" | "never";
          refreshExpired?: "auto" | "manual";
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
      execute: (widgetId?: string) => void;
    };
  }
}

export interface CloudflareTurnstileHandle {
  execute: () => void;
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let turnstileScriptPromise: Promise<void> | null = null;

const ensureTurnstileScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject("Window is not available");
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-turnstile-script='true']");

    const handleResolve = () => {
      if (window.turnstile) {
        resolve();
      } else {
        // In rare cases turnstile object is not immediately available
        const checkInterval = window.setInterval(() => {
          if (window.turnstile) {
            window.clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          window.clearInterval(checkInterval);
          if (window.turnstile) {
            resolve();
          } else {
            reject("Cloudflare Turnstile failed to initialize.");
          }
        }, 3000);
      }
    };

    if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        handleResolve();
        return;
      }
      existingScript.addEventListener("load", handleResolve, { once: true });
      existingScript.addEventListener("error", () => reject("Unable to load Cloudflare Turnstile script."), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-turnstile-script", "true");
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      handleResolve();
    };
    script.onerror = () => reject("Unable to load Cloudflare Turnstile script.");
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
};

export interface CloudflareTurnstileProps {
  siteKey?: string;
  action?: string;
  cData?: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  appearance?: "always" | "execute" | "interaction-only";
  retry?: "auto" | "never";
  refreshExpired?: "auto" | "manual";
  className?: string;
  retryKey?: number;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (message?: string) => void;
  onLoad?: () => void;
}

export const CloudflareTurnstile = forwardRef<CloudflareTurnstileHandle, CloudflareTurnstileProps>(({
  siteKey = import.meta.env.VITE_CF_TURNSTILE_SITE_KEY,
  action,
  cData,
  theme = "dark",
  size = "normal",
  appearance = "always",
  retry = "never",
  refreshExpired = "manual",
  className,
  retryKey,
  onVerify,
  onExpire,
  onError,
  onLoad,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const onLoadRef = useRef(onLoad);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isRenderingRef = useRef(false);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await ensureTurnstileScript();
        if (isMounted) {
          setScriptReady(true);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          const message = typeof error === "string" ? error : "Failed to load security challenge.";
          setLoadError(message);
          onErrorRef.current?.(message);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Main render effect - FIXED: removed unnecessary dependencies
  useEffect(() => {
    if (!scriptReady || !containerRef.current || !siteKey || isRenderingRef.current) {
      return;
    }

    if (!window.turnstile) {
      return;
    }

    // Prevent multiple renders
    isRenderingRef.current = true;

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        console.warn("Failed to remove existing widget:", e);
      }
      widgetIdRef.current = null;
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        cData,
        theme,
        size,
        appearance,
        retry,
        refreshExpired,
        callback: (token: string) => {
          onVerifyRef.current?.(token);
        },
        "expired-callback": () => {
          onExpireRef.current?.();
        },
        "timeout-callback": () => {
          onExpireRef.current?.();
        },
        "error-callback": () => {
          onErrorRef.current?.("Security check failed, please retry.");
        },
      });

      onLoadRef.current?.();
    } catch (error) {
      console.error("Failed to render Turnstile:", error);
      onErrorRef.current?.("Failed to initialize security check.");
    } finally {
      isRenderingRef.current = false;
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.warn("Cleanup error:", e);
        }
        widgetIdRef.current = null;
      }
      isRenderingRef.current = false;
    };
  }, [scriptReady, siteKey]); // CRITICAL: Only these two dependencies

  // Expose execute method to parent via ref
  useImperativeHandle(ref, () => ({
    execute: () => {
      if (widgetIdRef.current && window.turnstile?.execute) {
        try {
          window.turnstile.execute(widgetIdRef.current);
        } catch (e) {
          console.warn("Execute failed:", e);
          onErrorRef.current?.("Failed to execute security check.");
        }
      } else {
        onErrorRef.current?.("Security check not ready. Please wait.");
      }
    },
  }), []);

  // Separate effect for retry functionality
  useEffect(() => {
    if (retryKey === undefined || retryKey === 0) return;
    if (widgetIdRef.current && window.turnstile && !isRenderingRef.current) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (e) {
        console.warn("Reset failed:", e);
      }
    }
  }, [retryKey]);

  if (!siteKey) {
    return (
      <div className={cn("rounded-md border border-dashed border-yellow-500/60 bg-yellow-500/10 p-3 text-xs text-yellow-300", className)}>
        Missing Cloudflare Turnstile site key. Please set <code className="font-mono">VITE_CF_TURNSTILE_SITE_KEY</code>.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn("rounded-md border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-300", className)}>
        {loadError}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} aria-live="polite">
      <div ref={containerRef} className="min-h-[78px] flex items-center justify-start">
        {!scriptReady && (
          <div className="text-xs text-gray-400 animate-pulse">Loading Cloudflare security…</div>
        )}
      </div>
    </div>
  );
});

CloudflareTurnstile.displayName = "CloudflareTurnstile";

export default CloudflareTurnstile;