import * as Network from 'expo-network';
import { useEffect, useState } from 'react';

/** Whether the device can reach the internet. Optimistic (true) until we know otherwise. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let live = true;
    Network.getNetworkStateAsync().then((s) => live && setOnline(s.isInternetReachable !== false && s.isConnected !== false)).catch(() => {});
    const sub = Network.addNetworkStateListener((s) => setOnline(s.isInternetReachable !== false && s.isConnected !== false));
    return () => { live = false; sub.remove(); };
  }, []);
  return online;
}
