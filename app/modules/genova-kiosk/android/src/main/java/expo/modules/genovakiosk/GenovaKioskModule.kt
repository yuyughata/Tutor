package expo.modules.genovakiosk

import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Kiosk mode for children: Android Lock Task Mode (startLockTask).
 *
 * - On an ordinary phone the system shows its "screen pinning" prompt the first time. The pin can be removed
 *   with the system gesture (Back + Overview), unless the device lock requires its PIN to unpin.
 * - When Genova is the device owner (a dedicated tablet; see docs/KIOSK.md) the app is allow-listed for
 *   Lock Task Mode, no prompt appears, the system bars are hidden and the ONLY way out is stop() after
 *   the parent enters the 4-digit passcode inside the app.
 */
class GenovaKioskModule : Module() {
  private val context: Context get() = requireNotNull(appContext.reactContext) { "React context is not available" }
  private val dpm: DevicePolicyManager get() = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
  private val admin: ComponentName get() = ComponentName(context, GenovaDeviceAdminReceiver::class.java)

  private fun deviceOwner(): Boolean = dpm.isDeviceOwnerApp(context.packageName)

  override fun definition() = ModuleDefinition {
    Name("GenovaKiosk")

    Function("isDeviceOwner") { deviceOwner() }

    Function("isLocked") {
      val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    }

    /** Returns true when the request was made (the system may still ask the user to confirm screen pinning). */
    AsyncFunction("start") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      if (deviceOwner()) {
        dpm.setLockTaskPackages(admin, arrayOf(context.packageName))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
        }
      }
      activity.runOnUiThread {
        try { activity.startLockTask() } catch (_: Exception) { /* not allowed right now */ }
      }
      true
    }

    AsyncFunction("stop") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      activity.runOnUiThread {
        try { activity.stopLockTask() } catch (_: Exception) { /* was not locked */ }
      }
      true
    }
  }
}
