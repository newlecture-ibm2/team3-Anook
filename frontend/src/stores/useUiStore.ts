import { create } from 'zustand';

interface UiState {
  isSidebarOpen: boolean;
  activeModal: string | null;
  activeTab: string;

  // Toast properties
  isToastOpen: boolean;
  toastMessage: string;
  toastSubtitle?: string;
  toastType: 'success' | 'error';

  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setActiveTab: (tab: string) => void;

  // Toast actions
  showToast: (message: string, type?: 'success' | 'error', subtitle?: string) => void;
  hideToast: () => void;

  // i18n
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  activeTab: 'all',

  isToastOpen: false,
  toastMessage: '',
  toastSubtitle: undefined,
  toastType: 'success',

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  showToast: (message, type = 'success', subtitle) => {
    set({ isToastOpen: true, toastMessage: message, toastType: type, toastSubtitle: subtitle });
    setTimeout(() => {
      set({ isToastOpen: false });
    }, 3000); // 3초 뒤 자동 닫힘
  },
  hideToast: () => set({ isToastOpen: false }),

  language: 'ko',
  setLanguage: (lang) => set({ language: lang }),
}));
