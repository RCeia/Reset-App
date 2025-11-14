# Getting Started with the Expo App

This guide explains how to create a new Expo project, start the development server, and run the app on an Android device using **Expo Go**, including the `--tunnel` option for reliable connectivity.

---

## 1. Create a New Expo App

To create a fresh Expo project, run the following command:

```bash
npx create-expo-app@latest MyNewApp
```

Replace `MyNewApp` with the name of your project. After creation, enter the project directory:

```bash
cd MyNewApp
```

---

## 2. Start the Development Server

To launch Expo Dev Tools and start the Metro Bundler, run:

```bash
npx expo start
```

This command opens the Expo Dev Tools interface in your browser.

---

## 3. Run the App on an Android Phone (Expo Go)

To run the app on your Android device:

1. Install **Expo Go** from the Google Play Store.
2. Ensure your computer and phone are connected to the **same Wi-Fi network**.
3. Scan the QR code shown in the terminal or the Expo Dev Tools.

If everything is set up correctly, your project will load instantly on your Android device.

---

## 4. Using `--tunnel` for Connectivity Issues

If your Android device cannot connect via LAN due to Wi-Fi restrictions, firewalls, or network isolation, you can start the project using a tunneling connection:

```bash
npx expo start --tunnel
```

### What `--tunnel` Does

* Creates an external, secure connection between your device and the dev server.
* Allows Expo Go to access your project **even if LAN discovery fails**.
* Works through most networks, including restrictive or public Wi-Fi.

This option is slower than LAN but extremely reliable.

---

## 5. Additional Useful Commands

Clear Metro bundler cache:

```bash
npx expo start --clear
```

Start with a different host type:

```bash
npx expo start --localhost
```

---

## 6. Summary

* Use `npx create-expo-app` to generate your project.
* Start it with `npx expo start`.
* Run on Android via Expo Go by scanning the QR code.
* Use `--tunnel` if the default LAN mode fails to connect.

This setup ensures your app runs reliably both on the web and on Android devices during development.

---