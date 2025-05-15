// always-connected/backend/generate-vapid.js
import webPush from 'web-push';

const vapidKeys = webPush.generateVAPIDKeys();

console.log("VAPID Keys Generated:");
console.log("----------------------");
console.log("Public Key:");
console.log(vapidKeys.publicKey);
console.log("\nPrivate Key:");
console.log(vapidKeys.privateKey);
console.log("\n----------------------");
console.log("Copy these keys into your .env files.");
console.log(" - Public Key goes into: backend/.env (VAPID_PUBLIC_KEY) AND frontend/.env (VITE_VAPID_PUBLIC_KEY)");
console.log(" - Private Key goes into: backend/.env (VAPID_PRIVATE_KEY) ONLY.");