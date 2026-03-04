import api from "../api/client.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush() {
  // Check browser support
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("[Push] Not supported in this browser");
    return false;
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("[Push] Permission denied");
    return false;
  }

  // Get the service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Fetch VAPID public key from server
  const { data } = await api.get("/push/vapid-key");
  if (!data.vapidPublicKey) {
    console.log("[Push] VAPID key not configured on server");
    return false;
  }

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
  });

  // Send subscription to server
  await api.post("/push/subscribe", subscription.toJSON());
  console.log("[Push] Subscribed successfully");
  return true;
}
