/**
 * ZegoCloud Navigation Bridge for Expo Router
 *
 * ZegoCloud SDK calls `navigation.navigate('ZegoUIKitPrebuiltCallInCallScreen', params)`
 * internally. Expo Router doesn't handle these navigate calls through its linking config.
 *
 * This module stores the navigation params in memory so the bridge screen components
 * can read them directly (avoiding Expo Router's param serialization).
 */

let _zegoParams: Record<string, any> | null = null;

export function setZegoNavParams(params: Record<string, any>) {
  _zegoParams = { ...params };
}

export function getZegoNavParams(): Record<string, any> | null {
  return _zegoParams;
}

export function clearZegoNavParams() {
  _zegoParams = null;
}

/**
 * Screen names used by ZegoCloud SDK for internal navigation.
 */
export const ZEGO_SCREEN_NAMES = [
  "ZegoUIKitPrebuiltCallInCallScreen",
  "ZegoUIKitPrebuiltCallWaitingScreen",
] as const;

export function isZegoScreen(name: string): boolean {
  return ZEGO_SCREEN_NAMES.includes(name as any);
}
