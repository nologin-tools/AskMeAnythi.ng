import { WS_RECONNECT_INTERVAL, WS_MAX_RECONNECT_ATTEMPTS } from '@askmeanything/shared';
import type { WSMessage, WSEventType } from '@askmeanything/shared';
import { getVisitorId, getAdminToken } from './storage';

type MessageHandler = (data: unknown) => void;

export class SessionWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private isAdmin: boolean;
  private handlers: Map<WSEventType, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private isConnected = false;
  private onConnectionChange?: (connected: boolean) => void;
  private _reconnectFailed = false;

  constructor(sessionId: string, isAdmin = false) {
    this.sessionId = sessionId;
    this.isAdmin = isAdmin;
  }

  connect(onConnectionChange?: (connected: boolean) => void): void {
    this.onConnectionChange = onConnectionChange;
    this.doConnect();
  }

  private doConnect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const visitorId = getVisitorId();

    // Use URL + URLSearchParams for safe encoding
    const wsUrl = new URL(`${protocol}//${host}/ws/${encodeURIComponent(this.sessionId)}`);
    wsUrl.searchParams.set('visitorId', visitorId);
    if (this.isAdmin) {
      wsUrl.searchParams.set('admin', 'true');
    }

    this.ws = new WebSocket(wsUrl.toString());

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this._reconnectFailed = false;
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;

        // 处理 pong 响应
        if ((message as { type: string }).type === 'pong') return;

        const handlers = this.handlers.get(message.type);
        if (handlers) {
          handlers.forEach((handler) => handler(message.data));
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.isConnected = false;
      this.onConnectionChange?.(false);
      this.stopPing();
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  private startPing(): void {
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 每30秒发送心跳
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnect attempts reached');
      this._reconnectFailed = true;
      // Notify via connection change callback with false
      this.onConnectionChange?.(false);
      return;
    }

    this.reconnectAttempts++;
    const delay = WS_RECONNECT_INTERVAL * Math.min(this.reconnectAttempts, 5);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  on(event: WSEventType, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // 返回取消订阅函数
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  off(event: WSEventType, handler: MessageHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  get reconnectFailed(): boolean {
    return this._reconnectFailed;
  }
}

// 创建 WebSocket 实例的工厂函数
export function createSessionWebSocket(sessionId: string, isAdmin = false): SessionWebSocket {
  return new SessionWebSocket(sessionId, isAdmin);
}
