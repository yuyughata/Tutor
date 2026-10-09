package expo.modules.genovakiosk

import android.app.admin.DeviceAdminReceiver

/** Empty on purpose: it only exists so the app can be provisioned as device owner with `adb shell dpm set-device-owner`. */
class GenovaDeviceAdminReceiver : DeviceAdminReceiver()
