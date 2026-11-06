import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { useStore } from "zustand";

import { createQuickAddStore } from "./quick-add-store";
import type { QuickAddStoreState } from "./quick-add-store";

const QuickAddStoreContext = createContext<ReturnType<
  typeof createQuickAddStore
> | null>(null);

export function QuickAddStoreProvider({
  children,
  timeZone,
}: PropsWithChildren<{ timeZone: string }>): ReactElement {
  const [store] = useState(() =>
    createQuickAddStore({ now: new Date(), timeZone }),
  );

  return (
    <QuickAddStoreContext.Provider value={store}>
      {children}
    </QuickAddStoreContext.Provider>
  );
}

export function useQuickAddStore<T>(
  selector: (state: QuickAddStoreState) => T,
): T {
  const store = useContext(QuickAddStoreContext);

  if (store === null) {
    throw new Error(
      "useQuickAddStore must be used within QuickAddStoreProvider",
    );
  }

  return useStore(store, selector);
}
