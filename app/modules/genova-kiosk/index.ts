import { requireOptionalNativeModule } from 'expo';

/** Native Android Lock Task Mode. `null` on iOS, web and Expo Go, where only the in-app kiosk applies. */
type Native = {
  isDeviceOwner(): boolean;
  isLocked(): boolean;
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
};
export default requireOptionalNativeModule<Native>('GenovaKiosk');
