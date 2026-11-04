import { createContext, type PropsWithChildren, useContext } from 'react';

const FontsReadyContext = createContext(false);

type FontProviderProps = PropsWithChildren<{
  ready: boolean;
}>;

export function FontProvider({ ready, children }: FontProviderProps) {
  return <FontsReadyContext.Provider value={ready}>{children}</FontsReadyContext.Provider>;
}

export function useFontsReady(): boolean {
  return useContext(FontsReadyContext);
}
