'use client';

import { useNetworkStatus } from './useNetworkStatus';

export default function NetworkStatusListener() {
  useNetworkStatus();
  return null;
}
