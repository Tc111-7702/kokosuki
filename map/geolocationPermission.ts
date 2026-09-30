export type GeolocationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/** Permissions API が使える場合は状態を返す。未対応ブラウザは prompt 扱い */
export async function getGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
  if (!navigator.permissions?.query) return 'prompt';
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state as GeolocationPermissionState;
  } catch {
    return 'prompt';
  }
}
