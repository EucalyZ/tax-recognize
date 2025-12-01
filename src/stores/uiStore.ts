import { create } from 'zustand';

type PageType = 'home' | 'settings';

interface UIState {
  currentPage: PageType;
  sidebarCollapsed: boolean;
  detailModalOpen: boolean;
  selectedInvoiceId: string | null;
}

interface UIActions {
  setCurrentPage: (page: PageType) => void;
  toggleSidebar: () => void;
  openDetailModal: (id: string) => void;
  closeDetailModal: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  // Initial State
  currentPage: 'home',
  sidebarCollapsed: false,
  detailModalOpen: false,
  selectedInvoiceId: null,

  // Actions
  setCurrentPage: (page) => set({ currentPage: page }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openDetailModal: (id) => set({
    detailModalOpen: true,
    selectedInvoiceId: id,
  }),

  closeDetailModal: () => set({
    detailModalOpen: false,
    selectedInvoiceId: null,
  }),
}));
