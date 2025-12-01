import { create } from 'zustand';
import { Invoice, InvoiceFilter, Pagination } from '../types/invoice';
import { invoiceService } from '../services/invoiceService';

interface InvoiceState {
  invoices: Invoice[];
  selectedIds: string[];
  filter: InvoiceFilter;
  pagination: Pagination;
  loading: boolean;
  error: string | null;
}

interface InvoiceActions {
  fetchInvoices: () => Promise<void>;
  addInvoice: (filePath: string) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<void>;
  deleteBatch: (ids: string[]) => Promise<void>;
  updateFilter: (filter: Partial<InvoiceFilter>) => void;
  resetFilter: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  selectInvoice: (id: string) => void;
  deselectInvoice: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearError: () => void;
}

type InvoiceStore = InvoiceState & InvoiceActions;

const initialFilter: InvoiceFilter = {};

const initialPagination: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
};

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  // Initial State
  invoices: [],
  selectedIds: [],
  filter: initialFilter,
  pagination: initialPagination,
  loading: false,
  error: null,

  // Actions
  fetchInvoices: async () => {
    const { filter, pagination } = get();
    set({ loading: true, error: null });

    try {
      const result = await invoiceService.getInvoices(
        filter,
        pagination.page,
        pagination.pageSize
      );
      set({
        invoices: result.data,
        pagination: result.pagination,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取发票列表失败';
      set({ error: message, loading: false });
    }
  },

  addInvoice: async (filePath: string) => {
    set({ loading: true, error: null });

    try {
      const invoice = await invoiceService.recognizeAndSaveInvoice(filePath);
      // 重新获取列表以保持一致性
      await get().fetchInvoices();
      return invoice;
    } catch (err) {
      const message = err instanceof Error ? err.message : '添加发票失败';
      set({ error: message, loading: false });
      return null;
    }
  },

  deleteInvoice: async (id: string) => {
    set({ loading: true, error: null });

    try {
      await invoiceService.deleteInvoice(id);
      // 从选中列表中移除
      set((state) => ({
        selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
      }));
      // 重新获取列表
      await get().fetchInvoices();
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除发票失败';
      set({ error: message, loading: false });
    }
  },

  deleteBatch: async (ids: string[]) => {
    if (ids.length === 0) return;

    set({ loading: true, error: null });

    try {
      await invoiceService.deleteInvoices(ids);
      // 清空选中
      set({ selectedIds: [] });
      // 重新获取列表
      await get().fetchInvoices();
    } catch (err) {
      const message = err instanceof Error ? err.message : '批量删除失败';
      set({ error: message, loading: false });
    }
  },

  updateFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
      pagination: { ...state.pagination, page: 1 }, // 重置到第一页
    }));
  },

  resetFilter: () => {
    set({
      filter: initialFilter,
      pagination: { ...get().pagination, page: 1 },
    });
  },

  setPage: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, page },
    }));
  },

  setPageSize: (pageSize) => {
    set((state) => ({
      pagination: { ...state.pagination, pageSize, page: 1 },
    }));
  },

  selectInvoice: (id) => {
    set((state) => {
      if (state.selectedIds.includes(id)) {
        return state;
      }
      return { selectedIds: [...state.selectedIds, id] };
    });
  },

  deselectInvoice: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
    }));
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: state.invoices.map((inv) => inv.id),
    }));
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  clearError: () => {
    set({ error: null });
  },
}));
