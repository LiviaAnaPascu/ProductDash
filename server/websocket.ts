// WebSocket server setup
// This would typically run as a separate server or use a service like Pusher
// For development, you can run this alongside Next.js

import { WebSocketServer, WebSocket } from 'ws';
import { Product } from '@/types/product';

let wss: WebSocketServer | null = null;

export const initializeWebSocketServer = (port: number = 8080) => {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket client connected');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        // Handle different message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log(`WebSocket server running on port ${port}`);
  return wss;
};

export const broadcastProducts = (products: Product[]) => {
  if (!wss) return;

  const message = JSON.stringify({
    type: 'products_update',
    products,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

export const getWebSocketServer = () => wss;

