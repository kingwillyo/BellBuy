import { logger } from "@/lib/logger";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export interface ConnectivityState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isOffline: boolean;
  isSlowConnection: boolean;
}

export function useConnectivity() {
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>(
    {
      isConnected: null,
      isInternetReachable: null,
      connectionType: null,
      isOffline: false,
      isSlowConnection: false,
    }
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOffline =
        state.isConnected === false || state.isInternetReachable === false;
      const isSlowConnection =
        state.type === "cellular" &&
        (state.details?.cellularGeneration === "2g" ||
          state.details?.cellularGeneration === "3g");

      const newState: ConnectivityState = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isOffline,
        isSlowConnection,
      };

      setConnectivityState((prevState) => {
        // Log connectivity changes for debugging
        if (prevState.isOffline !== isOffline) {
          logger.info(
            `Connectivity changed: ${isOffline ? "OFFLINE" : "ONLINE"}`,
            {
              component: "useConnectivity",
              previousState: prevState.isOffline,
              newState: isOffline,
              connectionType: state.type,
            }
          );
        }

        return newState;
      });
    });

    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      const isOffline =
        state.isConnected === false || state.isInternetReachable === false;
      const isSlowConnection =
        state.type === "cellular" &&
        (state.details?.cellularGeneration === "2g" ||
          state.details?.cellularGeneration === "3g");

      setConnectivityState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        isOffline,
        isSlowConnection,
      });
    });

    return unsubscribe;
  }, []);

  return connectivityState;
}
