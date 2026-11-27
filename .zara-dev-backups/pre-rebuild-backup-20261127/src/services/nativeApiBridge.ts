const DEFAULT_CLOUD_API_ORIGIN =
  'https://ais-pre-qfebbx4373mpl6gv6xf3bh-147569699588.asia-southeast1.run.app';

let fetchBridgeInstalled = false;

export function isBundledNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname === 'appassets.androidplatform.net') return true;
  try {
    return Boolean((window as any).ZaraAndroidBridge?.isBundledNativeApp?.());
  } catch {
    return false;
  }
}

export function getNativeServerOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_API_ORIGIN;
  try {
    const bridged = (window as any).ZaraAndroidBridge?.getServerUrl?.();
    if (typeof bridged === 'string' && /^https?:\/\//i.test(bridged.trim())) {
      return bridged.trim().replace(/\/+$/, '');
    }
  } catch {}
  return DEFAULT_CLOUD_API_ORIGIN;
}

export function resolveNativeApiUrl(url: string): string {
  if (!isBundledNativeAndroidApp()) return url;
  if (url.startsWith('/api/')) {
    return `${getNativeServerOrigin()}${url}`;
  }
  return url;
}

export function resolveNativeWsUrl(apiPath: string): string {
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (isBundledNativeAndroidApp()) {
    try {
      const target = new URL(getNativeServerOrigin());
      const wsProto = target.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${target.host}${cleanPath}`;
    } catch {}
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${cleanPath}`;
}

export function installNativeFetchBridge(): void {
  if (fetchBridgeInstalled || typeof window === 'undefined') return;
  if (!isBundledNativeAndroidApp()) return;
  fetchBridgeInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        return originalFetch(resolveNativeApiUrl(input), init);
      }
      if (input instanceof URL && input.origin === window.location.origin && input.pathname.startsWith('/api/')) {
        const rewritten = `${getNativeServerOrigin()}${input.pathname}${input.search}`;
        return originalFetch(rewritten, init);
      }
      if (typeof Request !== 'undefined' && input instanceof Request) {
        const parsed = new URL(input.url, window.location.origin);
        if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/')) {
          const rewritten = `${getNativeServerOrigin()}${parsed.pathname}${parsed.search}`;
          return originalFetch(new Request(rewritten, input), init);
        }
      }
    } catch {
      // Fall through to originalFetch on unexpected URL shapes
    }
    return originalFetch(input as any, init);
  };
}
