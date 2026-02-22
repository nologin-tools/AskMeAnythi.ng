import type { WSMessage } from '@askmeanything/shared';

export class SessionRoom implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 内部广播请求
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.json() as WSMessage;
      this.broadcast(message);
      return new Response('OK');
    }

    // WebSocket 升级
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // 获取连接参数
      const visitorId = url.searchParams.get('visitorId') || undefined;

      // 接受 WebSocket 连接（启用 hibernation）
      this.state.acceptWebSocket(server);

      // 存储连接元数据
      server.serializeAttachment({ visitorId });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  // WebSocket 消息处理（hibernation 模式）
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data = JSON.parse(message as string);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // 忽略无效消息
    }
  }

  // WebSocket 关闭处理
  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    // Hibernation mode handles cleanup automatically
  }

  // WebSocket 错误处理
  async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
    // Hibernation mode handles cleanup automatically
  }

  // 广播消息给所有连接 (use authoritative getWebSockets)
  private broadcast(message: WSMessage, excludeWs?: WebSocket): void {
    const payload = JSON.stringify(message);

    for (const ws of this.state.getWebSockets()) {
      if (ws === excludeWs) continue;

      try {
        ws.send(payload);
      } catch {
        // Connection already closed, hibernation mode will clean up
      }
    }
  }
}
