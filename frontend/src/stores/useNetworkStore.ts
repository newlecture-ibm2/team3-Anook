import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  setOnline: (status: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  // 서버 사이드 렌더링(SSR) 환경에서는 기본값 true로 설정
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  setOnline: (status) => set({ isOnline: status }),
}));
