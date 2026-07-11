'use client';

import { createContext, useContext, ReactNode } from 'react';

interface SearchContextValue {
  openSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({
  openSearch,
  children,
}: {
  openSearch: () => void;
  children: ReactNode;
}) {
  return (
    <SearchContext.Provider value={{ openSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return ctx;
}
