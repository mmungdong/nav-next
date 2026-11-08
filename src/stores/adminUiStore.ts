import { create } from 'zustand';

/**
 * Chrome state shared by the admin shell and the page it renders.
 *
 * The sidebar owns category selection while the page renders the selected
 * category's sites, so selection and search have to live outside either of
 * them. Sidebar collapse persists; nothing else is worth restoring on reload.
 */

const COLLAPSE_KEY = 'admin:sidebar-collapsed';

const readCollapsed = (): boolean => {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};

/** The page owns the category dialogs; the sidebar only announces what was asked. */
export type CategoryIntent =
  | { kind: 'add' }
  | { kind: 'edit'; id: number }
  | { kind: 'delete'; id: number }
  | { kind: 'sort' };

interface AdminUiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  searchQuery: string;
  activeCategoryId: number | null;
  categoryManageMode: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategoryId: (id: number | null) => void;
  setCategoryManageMode: (managing: boolean) => void;
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  searchQuery: '',
  activeCategoryId: null,
  categoryManageMode: false,
  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // A blocked storage keeps the in-memory value; collapse still works.
    }
  },
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveCategoryId: (id) => set({ activeCategoryId: id }),
  setCategoryManageMode: (managing) => set({ categoryManageMode: managing }),
}));

/** Hydration for client-only persisted chrome: call once when the shell mounts. */
export const hydrateAdminUi = () => {
  useAdminUiStore.setState({ sidebarCollapsed: readCollapsed() });
};
