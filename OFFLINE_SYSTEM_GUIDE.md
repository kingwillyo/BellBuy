
# Offline System Implementation Guide

This document explains how to use the new offline handling system in your React Native app.

## Overview

The offline system provides:

- Real-time connectivity detection
- Consistent offline UI components
- Automatic retry queue for failed operations
- Graceful degradation when offline
- Pinterest-style offline experience

## Components

### 1. OfflineProvider

Wrap your app with the OfflineProvider to enable offline functionality:

```tsx
import { OfflineProvider } from "../context/OfflineContext";

export default function App() {
  return <OfflineProvider>{/* Your app content */}</OfflineProvider>;
}
```

### 2. OfflineBanner

Shows a banner at the top when offline:

```tsx
import { OfflineBanner } from "../components/OfflineBanner";

<OfflineBanner
  isVisible={isOffline}
  onRetry={handleRetry}
  message="Custom offline message"
/>;
```

### 3. OfflineIndicator

Small indicator for headers and status areas:

```tsx
import { OfflineIndicator } from "../components/OfflineIndicator";

<OfflineIndicator
  isOffline={isOffline}
  isSlowConnection={isSlowConnection}
  size="small" // or "medium" or "large"
/>;
```

### 4. OfflinePlaceholder

Full-screen placeholder for offline states:

```tsx
import { OfflinePlaceholder } from "../components/OfflinePlaceholder";

<OfflinePlaceholder
  title="You're Offline"
  message="Connect to browse products"
  showRetryButton={true}
  onRetry={fetchData}
/>;
```

### 5. OfflineOverlay

Modal-style overlay for offline states:

```tsx
import { OfflineOverlay } from "../components/OfflineOverlay";

<OfflineOverlay isVisible={isOffline} onRetry={handleRetry} />;
```

## Hooks

### useOffline()

Access offline state and retry queue:

```tsx
import { useOffline } from "../context/OfflineContext";

function MyComponent() {
  const { isOffline, isSlowConnection, addToRetryQueue, executeRetryQueue } =
    useOffline();

  const handleRetry = async () => {
    await executeRetryQueue();
  };

  return (
    <View>
      {isOffline && <Text>You're offline</Text>}
      <Button title="Retry" onPress={handleRetry} />
    </View>
  );
}
```

### useConnectivity()

Direct access to connectivity state:

```tsx
import { useConnectivity } from "../hooks/useConnectivity";

function MyComponent() {
  const { isOffline, connectionType, isSlowConnection } = useConnectivity();

  return (
    <Text>
      Status: {isOffline ? "Offline" : "Online"}({connectionType})
    </Text>
  );
}
```

## Network Utilities

### executeWithOfflineSupport()

Execute operations with offline awareness:

```tsx
import { executeWithOfflineSupport } from "../lib/networkUtils";

const result = await executeWithOfflineSupport(
  async () => {
    // Your network operation
    const response = await fetch("/api/data");
    return response.json();
  },
  {
    context: "fetching data",
    addToRetryQueue: true,
    showOfflineMessage: false,
    onOfflineAction: () => {
      // Custom action when offline
    },
  }
);

if (result) {
  // Handle successful result
}
```

### Updated handleNetworkError()

Now supports offline detection:

```tsx
import { handleNetworkError } from "../lib/networkUtils";

try {
  await someNetworkOperation();
} catch (error) {
  await handleNetworkError(error, {
    context: "operation name",
    showAlert: true,
    addToRetryQueue: true,
    retryAction: () => someNetworkOperation(),
  });
}
```

## Usage Patterns

### 1. Data Fetching with Caching

```tsx
function ProductList() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOffline, addToRetryQueue } = useOffline();

  const fetchProducts = async () => {
    setIsLoading(true);

    const result = await executeWithOfflineSupport(
      async () => {
        const response = await fetch("/api/products");
        return response.json();
      },
      {
        context: "loading products",
        addToRetryQueue: true,
        showOfflineMessage: false,
        onOfflineAction: () => {
          // Show cached data if available
          loadCachedProducts();
        },
      }
    );

    if (result) {
      setProducts(result);
      cacheProducts(result);
    }

    setIsLoading(false);
  };

  // Show offline placeholder when no cached data
  if (isOffline && products.length === 0 && !isLoading) {
    return (
      <OfflinePlaceholder
        title="You're Offline"
        message="Connect to browse products"
        onRetry={fetchProducts}
      />
    );
  }

  return (
    <ScrollView>
      <ProductList data={products} />
    </ScrollView>
  );
}
```

### 2. Form Submission with Retry Queue

```tsx
function ContactForm() {
  const { addToRetryQueue } = useOffline();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);

    try {
      await submitForm(formData);
      // Success
    } catch (error) {
      // Add to retry queue if offline
      addToRetryQueue(async () => {
        await submitForm(formData);
      });

      await handleNetworkError(error, {
        context: "submitting form",
        addToRetryQueue: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### 3. Header with Connectivity Indicator

```tsx
function AppHeader({ title }) {
  const { isOffline, isSlowConnection } = useOffline();

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {(isOffline || isSlowConnection) && (
        <OfflineIndicator
          isOffline={isOffline}
          isSlowConnection={isSlowConnection}
          size="small"
        />
      )}
    </View>
  );
}
```

## Best Practices

### 1. Graceful Degradation

- Always provide fallback content when offline
- Cache important data for offline viewing
- Show cached content with offline indicators

### 2. User Experience

- Use consistent offline messaging
- Provide clear retry mechanisms
- Don't block users from viewing cached content

### 3. Performance

- Check connectivity before expensive operations
- Use retry queues for non-critical operations
- Implement proper caching strategies

### 4. Error Handling

- Distinguish between network errors and offline states
- Provide context-specific error messages
- Log connectivity changes for debugging

## Migration from Old System

### Before (Old System)

```tsx
try {
  const data = await fetch("/api/data");
  setData(data);
} catch (error) {
  handleNetworkError(error, {
    context: "loading data",
    onRetry: () => fetchData(),
  });
}
```

### After (New System)

```tsx
const result = await executeWithOfflineSupport(
  async () => {
    const response = await fetch("/api/data");
    return response.json();
  },
  {
    context: "loading data",
    addToRetryQueue: true,
    showOfflineMessage: false,
  }
);

if (result) {
  setData(result);
}
```

## Testing Offline Functionality

1. **Enable Airplane Mode** - Test complete offline state
2. **Disable WiFi** - Test network switching
3. **Throttle Network** - Test slow connections
4. **Network Interruption** - Test connection drops during operations

## Troubleshooting

### Common Issues

1. **Offline banner not showing**
   - Ensure OfflineProvider wraps your app
   - Check if useOffline hook is used correctly

2. **Retry queue not working**
   - Verify addToRetryQueue is called with async function
   - Check if executeRetryQueue is called when online

3. **UI components not styled correctly**
   - Ensure theme colors are imported
   - Check if useColors hook is working

### Debug Logs

The system logs connectivity changes and retry queue operations. Check your logger for:

- "Connectivity changed: OFFLINE/ONLINE"
- "Operation queued for retry when online"
- "Executing retry queue"

This offline system provides a robust, Pinterest-style experience that gracefully handles network issues while maintaining a great user experience.
