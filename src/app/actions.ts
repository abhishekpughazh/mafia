"use server"
import os from 'os';

export async function getLocalIp() {
  // On Vercel, VERCEL_URL is automatically set to the deployment hostname
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }
  // Local dev: find the LAN IP so other devices on the same Wi-Fi can connect
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}
