# Kiosk mode (keeping a child inside Genova)

Parents turn it on in **Grown-ups > Passcode and kiosk mode**. It needs a signed-in parent with a 4-digit passcode, because the passcode is the only way out.

## What it does
| Platform | While kiosk mode is on |
|---|---|
| Android (build with the local `GenovaKiosk` module) | Calls `startLockTask()` (Lock Task Mode) every time the app comes to the foreground. The hardware Back button never leaves the app. |
| Android, Genova set up as *device owner* | Full lock: no prompt, system bars hidden, no Home/Overview/notification access. The ONLY way out is the parent entering the passcode in Genova. |
| iPhone / iPad | In-app only (Back/escape does nothing). Apple does not let an ordinary app lock the device: also turn on **Guided Access** (Settings > Accessibility > Guided Access) or use Single App Mode through MDM. |
| Web | In-app only. |

Turning kiosk mode **off** always asks for the passcode again (no 30-second grace). Five wrong tries lock the pad for one minute. Signing out turns kiosk mode off.

## Ordinary Android phone (screen pinning)
Without device-owner status Android treats `startLockTask()` as **screen pinning**: the first time, the system asks the parent to confirm. A pinned app can still be released by the system gesture (hold Back + Overview, or swipe-up-and-hold on gesture navigation). If the device has a screen lock, enable **Settings > Security > Screen pinning > Ask for PIN before unpinning** so a child cannot release it. This is a platform limit: an app cannot block that gesture by itself.

## Dedicated tablet (recommended for a real kiosk)
Make Genova the device owner once, on a **freshly reset tablet with no accounts added** (Android requires this):
```sh
adb shell dpm set-device-owner com.custar.genova/expo.modules.genovakiosk.GenovaDeviceAdminReceiver
```
Then kiosk mode uses full Lock Task Mode (the module allow-lists the app and removes the system UI features). To undo it, uninstall the app or factory-reset the tablet.

## Build notes
- The module lives in `app/modules/genova-kiosk` (Kotlin, Expo Modules API) and is picked up by autolinking (`npx expo-modules-autolinking resolve --platform android` lists it). It needs a **development or release build** (`eas build`), not Expo Go.
- The Kotlin code could not be compiled in the original build sandbox (no Android SDK). First build: run `eas build -p android --profile preview`, install on a device, switch kiosk mode on, and check: pin prompt (or silent lock on a device-owner tablet), Back does nothing, wrong PIN refuses, right PIN releases.
