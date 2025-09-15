import { ConnectivityState, useConnectivity } from "@/hooks/useConnectivity";
import { logger } from "@/lib/logger";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface OfflineContextType {
  connectivityState: ConnectivityState;
  isOffline: boolean;
  isSlowConnection: boolean;
  retryQueue: (() => Promise<void>)[];
  addToRetryQueue: (action: () => Promise<void>) => void;
  executeRetryQueue: () => Promise<void>;
  clearRetryQueue: () => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const connectivityState = useConnectivity();
  const [retryQueue, setRetryQueue] = useState<(() => Promise<void>)[]>([]);

  const { isOffline, isSlowConnection } = connectivityState;

  // Execute retry queue when coming back online
  useEffect(() => {
    if (!isOffline && retryQueue.length > 0) {
      logger.info("Connection restored, executing retry queue", {
        component: "OfflineContext",
        queueLength: retryQueue.length,
      });

      executeRetryQueue();
    }
  }, [isOffline]);

  const addToRetryQueue = (action: () => Promise<void>) => {
    setRetryQueue((prev) => [...prev, action]);
    logger.debug("Added action to retry queue", {
      component: "OfflineContext",
      queueLength: retryQueue.length + 1,
    });
  };

  const executeRetryQueue = async () => {
    if (retryQueue.length === 0) return;

    logger.info("Executing retry queue", {
      component: "OfflineContext",
      queueLength: retryQueue.length,
    });

    const actions = [...retryQueue];
    setRetryQueue([]);

    // Execute actions sequentially to avoid overwhelming the server
    for (const action of actions) {
      try {
        await action();
      } catch (error) {
        logger.error("Retry queue action failed", error, {
          component: "OfflineContext",
        });
        // Optionally re-add failed actions to queue
        // setRetryQueue(prev => [...prev, action]);
      }
    }
  };

  const clearRetryQueue = () => {
    setRetryQueue([]);
    logger.debug("Cleared retry queue", {
      component: "OfflineContext",
    });
  };

  const contextValue: OfflineContextType = {
    connectivityState,
    isOffline,
    isSlowConnection,
    retryQueue,
    addToRetryQueue,
    executeRetryQueue,
    clearRetryQueue,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}
