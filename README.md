[README.md](https://github.com/user-attachments/files/32801602/README.md)

# IoT-4G Smart Vehicle — Command Center System

Part of the final-year project **"AI-Enabled 4G LTE-IoT Based Autonomous Smart Utility Vehicle with Hybrid Network Communication."**
This repo covers the connectivity + command-center software layer: WiFi/4G failover firmware, a Firebase backend, and three web apps (command center, per-vehicle control, hospital staff requests) built around a demo hospital delivery use case.

**Live site:** `https://1adarshgajagotra.github.io/IoT-GSM-based-smart-Vehicle/`

---

## What's in this repo

| File | What it is |
|---|---|
| `index.html` | Login page (Firebase Auth). Redirects to `dashboard.html` (operator/admin) or `staff-app.html` (hospital staff) based on role. |
| `dashboard.html` | Command center: live fleet map, status charts, device list, incoming staff requests, notifications, staff-account creation, and full admin user management. |
| `device-detail.html` | Per-vehicle control screen: live video panel (placeholder), mini position map, 4G/WiFi/battery meters, manual D-pad, autonomous toggle, emergency stop, route planning, two-way messaging, admin override. |
| `staff-app.html` | Mobile-first app for hospital staff to submit "deliver X from room A to room B" requests and track their status. |
| `floor-plan.js` | Shared hospital floor-plan renderer (rooms, corridors, doors, icons) used by all three pages above. |
| `wifi_4g_failover_v2.ino` | ESP32-S3 + Quectel EC200U firmware: WiFi-primary/LTE-backup failover state machine. |
| `esp32_status_push.ino` | ESP32 firmware that pushes vehicle status/telemetry (including calibrated WiFi signal %) to Firebase over WiFi. |

There is no build step — every `.html` file is self-contained and loads Firebase + Chart.js from CDNs. Deployment is just pushing files to this repo with GitHub Pages enabled.

---

## Architecture

```
Hospital Staff phone ──▶ staff-app.html ──┐
                                           ├──▶ Firebase Realtime Database ◀── ESP32-S3 + EC200U
Operator/Admin browser ──▶ dashboard.html ─┤        (Auth + RTDB, free                  │ (WiFi/4G failover,
                       └─▶ device-detail.html   Spark plan)                              telemetry push)
```

- **Auth:** Firebase Authentication (email/password). Roles (`admin` / `operator` / `staff`) are stored per-user in the database, not in Firebase Auth itself.
- **Data:** Firebase Realtime Database. The vehicle's firmware writes status/telemetry directly (open write, since the device can't sign in); all *command* writes (routes, emergency stop, overrides) require an authenticated, role-checked user — enforced by the database security rules, not just hidden in the UI.
- **Hosting:** GitHub Pages (free, static).

### Data model (Realtime Database)

```
/users/{uid}                = { email, role: "admin"|"operator"|"staff", disabled, createdBy, createdAt }

/devices/{deviceId}/status    = { online, link: "wifi"|"lte", lastSeen }
/devices/{deviceId}/telemetry = { speed, battery, signalWifi, signal4g, mapX, mapY, task }
/devices/{deviceId}/control/operator        = { pickup, destination, mode, manualDir, issuedBy, ts }
/devices/{deviceId}/control/admin           = (same shape as operator's)
/devices/{deviceId}/control/activeSource    = "operator" | "admin"
/devices/{deviceId}/control/emergencyStopGlobal = { active, by, role, ts }
/devices/{deviceId}/messages/{pushId}       = { from, role, text, ts }

/requests/{pushId} = { item, fromRoom, toRoom, requestedBy, requestedByUid,
                        status: "pending"|"assigned", assignedDeviceId, assignedBy, ts }

/notifications/{pushId} = { message, severity, ts }
```

A vehicle's *effective* command source is `control/activeSource`: normally `"operator"`, but an admin can flip it to `"admin"` to take over — at that point the vehicle (once its firmware reads this field) should obey `control/admin` and ignore `control/operator`, regardless of which was written more recently.

---

## Roles & permissions

| | Operator | Admin | Hospital Staff |
|---|---|---|---|
| View dashboard, devices, map | ✅ | ✅ | ❌ |
| Send routes, manual control, emergency stop | ✅ | ✅ | ❌ |
| Override another role's command | ❌ | ✅ | ❌ |
| Create Hospital Staff accounts | ✅ | ✅ | ❌ |
| Create/manage Operator & Admin accounts | ❌ | ✅ | ❌ |
| Submit material requests | ❌ | ❌ | ✅ |
| Assign a request to a vehicle | ✅ | ✅ | ❌ |

---

## Setup

1. **Firebase project** — create one free (Spark plan) at [console.firebase.google.com](https://console.firebase.google.com).
2. **Enable Authentication** — Authentication → Sign-in method → Email/Password.
3. **Enable Realtime Database** — create it, then set the rules below.
4. **Get your web app config** — Project settings → General → Your apps → copy `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` into the `FIREBASE_CONFIG` object at the top of the `<script>` in `index.html`, `dashboard.html`, `device-detail.html`, and `staff-app.html`.
5. **Bootstrap the first admin** — there's no self-signup by design. Create one user manually in Authentication → Add user, then add a matching node under `users/<that UID>` with `{ "email": "...", "role": "admin", "disabled": false }` via the Realtime Database console (or a one-off `fetch(...)` PUT from DevTools on any non-`chrome://` page).
6. **Security rules** — paste this into Realtime Database → Rules:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin' || (root.child('users').child(auth.uid).child('role').val() === 'operator' && newData.child('role').val() === 'staff'))"
      }
    },
    "devices": {
      ".read": "auth != null",
      "$deviceId": {
        "status": { ".write": true },
        "telemetry": { ".write": true },
        "messages": { ".write": true },
        "control": {
          "operator": { ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() != 'staff'" },
          "admin": { ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'" },
          "activeSource": { ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() != 'staff'" },
          "emergencyStopGlobal": { ".write": "auth != null" }
        }
      }
    },
    "requests": {
      ".read": "auth != null",
      ".indexOn": ["requestedByUid"],
      "$requestId": {
        ".write": "auth != null && (!data.exists() || root.child('users').child(auth.uid).child('role').val() != 'staff')"
      }
    },
    "notifications": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

7. **Deploy** — push all files to this repo, enable GitHub Pages (Settings → Pages → deploy from `main` / root). `index.html` at the root makes the bare site URL work.
8. **Flash the firmware** — fill in WiFi credentials, APN, and the Firebase database URL in `esp32_status_push.ino` and `wifi_4g_failover_v2.ino`, then upload via Arduino IDE.
9. **Seed demo data** — log in as admin → Admin tab → "Seed / refresh simulated demo devices" to populate the fleet map and charts for a demo without needing the real vehicle present.

---

## Known limitations (be upfront about these in a demo/viva)

- **Two-way "call" is text messaging, not voice.** Real audio calling to a moving vehicle over cellular is a separate audio-streaming project (mic/speaker hardware + streaming), not built here.
- **Live video feed is a placeholder.** Needs a camera stream source (e.g. ESP32-CAM or USB webcam via the EC200U's data link) wired into `device-detail.html`'s video panel.
- **Indoor position is set manually**, not tracked automatically. Real indoor positioning (BLE beacons, UWB, etc.) isn't implemented — an operator/admin clicks the floor map to place the vehicle.
- **4G signal % is a placeholder (0)** in `esp32_status_push.ino` since that file only has a WiFi path. WiFi signal % *is* real (calibrated from `WiFi.RSSI()`). Getting a real 4G number means merging in `lteSignalPercent()` using the modem object from `wifi_4g_failover_v2.ino`.
- **Desktop notifications only fire while a browser tab is open** somewhere (even minimized) — there's no backend, so true background push (via Firebase Cloud Messaging) isn't wired up; that needs a paid Blaze-plan backend component.
- **"Disable" user, not "delete.**" Permanently deleting a Firebase Auth account needs the Admin SDK (a backend), which isn't part of this static-hosting setup. Disabling blocks login and is functionally equivalent for this project's purposes.
- **TinyGSM has no native EC200U profile** as of writing; the firmware uses the SIM7600 profile as the closest AT-command-compatible stand-in. Verify against your exact firmware revision before depending on anything beyond registration/GPRS/plain TCP.
- **Admin override is enforced by `activeSource`**, not "last write wins" — the vehicle firmware must actually check this field and prioritize `control/admin` when set. That firmware-side logic hasn't been written yet; today this only affects what the web UI shows/allows.

---

## Free-tier notes

Everything here runs on free tiers: GitHub Pages (hosting), Firebase Spark plan (Auth + Realtime Database), Chart.js/Firebase SDKs (public CDNs). No credit card or paid plan required for anything documented above.
