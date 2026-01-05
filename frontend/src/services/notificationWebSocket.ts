/**
 * WebSocket client for real-time notifications
 * Establishes and manages WebSocket connection to /api/v1/notifications/ws
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface WebSocketClientOptions {
  token: string;
  onNotification?: (notification: NotificationPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

/**
 * WebSocket client for notifications
 * Handles connection, reconnection, and message handling
 */
export class NotificationWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketClientOptions>;
  private reconnectCount = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageQueue: NotificationPayload[] = [];
  private isConnecting = false;

  constructor(baseUrl: string, options: WebSocketClientOptions) {
    this.url = `${baseUrl}/api/v1/notifications/ws?token=${encodeURIComponent(options.token)}`;
    this.options = {
      reconnectAttempts: options.reconnectAttempts ?? 5,
      reconnectInterval: options.reconnectInterval ?? 3000,
      onNotification: options.onNotification ?? (() => {}),
      onConnect: options.onConnect ?? (() => {}),
      onDisconnect: options.onDisconnect ?? (() => {}),
      onError: options.onError ?? (() => {}),
      token: options.token,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to notifications server');
          this.isConnecting = false;
          this.reconnectCount = 0;

          // Process queued messages
          this.messageQueue.forEach((msg) => this.options.onNotification(msg));
          this.messageQueue = [];

          this.options.onConnect();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data) as NotificationPayload;
            console.log('[WebSocket] Received notification:', notification);
            this.options.onNotification(notification);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[WebSocket] Connection error:', event);
          const error = new Error('WebSocket connection error');
          this.options.onError(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Connection closed');
          this.isConnecting = false;
          this.options.onDisconnect();
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('[WebSocket] Disconnected');
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectCount >= this.options.reconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    const delay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectCount);
    console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectCount + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectCount++;
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Hook for using notification WebSocket
 */
export function useNotificationWebSocket(token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<NotificationWebSocketClient | null>(null);

  const getBaseUrl = useCallback(() => {
    // Get API URL from environment or default
    const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';

    // Build WebSocket URL
    let wsUrl: string;

    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      // Absolute URL - convert to WebSocket protocol
      wsUrl = apiUrl.replace(/^http/, 'ws');
    } else {
      // Relative URL - build from current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}`;
    }

    // Remove /api/v1 suffix if present to get base URL
    return wsUrl.replace(/\/api\/v1$/, '');
  }, []);

  const handleNotification = useCallback((notification: NotificationPayload) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const baseUrl = getBaseUrl();

    const client = new NotificationWebSocketClient(baseUrl, {
      token,
      onNotification: handleNotification,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: (err) => setError(err),
      reconnectAttempts: 5,
      reconnectInterval: 3000,
    });

    clientRef.current = client;

    // Connect
    client.connect().catch((err) => {
      console.error('[Hook] Failed to connect:', err);
      setError(err);
    });

    return () => {
      client.disconnect();
    };
  }, [token, getBaseUrl, handleNotification]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    if (clientRef.current) {
      clientRef.current.connect().catch((err) => {
        console.error('[Hook] Failed to reconnect:', err);
        setError(err);
      });
    }
  }, [disconnect]);

  return {
    isConnected,
    notifications,
    error,
    disconnect,
    reconnect,
  };
}
