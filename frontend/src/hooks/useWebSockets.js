import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

export const useWebSockets = (
  roomId,
  username,
  onRemoteDrawAction,
  onCursorUpdate,
  onActiveUsersUpdate
) => {
  const [isConnected, setIsConnected] = useState(false);
  const stompClientRef = useRef(null);

  // Throttling state for mouse moves
  const lastCursorSentRef = useRef(0);
  const cursorTimeoutRef = useRef(null);
  const pendingCursorRef = useRef(null);

  useEffect(() => {
    if (!roomId || !username) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${backendUrl.replace(/^https?:\/\//, '')}/ws-connect/websocket`;

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);
        console.log('Connected to WebSocket server natively');

        // 1. Subscribe to drawing strokes
        client.subscribe(`/topic/room/${roomId}`, (message) => {
          if (message.body) {
            const action = JSON.parse(message.body);
            // Skip our own messages to avoid double rendering
            if (action.username !== username) {
              onRemoteDrawAction(action);
            }
          }
        });

        // 2. Subscribe to cursor tracking
        client.subscribe(`/topic/room/${roomId}/cursors`, (message) => {
          if (message.body) {
            const cursor = JSON.parse(message.body);
            if (cursor.username !== username) {
              onCursorUpdate(cursor);
            }
          }
        });

        // 3. Subscribe to active users panel updates
        client.subscribe(`/topic/room/${roomId}/users`, (message) => {
          if (message.body) {
            const users = JSON.parse(message.body);
            onActiveUsersUpdate(users);
          }
        });

        // 4. Send join announcement message
        client.publish({
          destination: `/app/join/${roomId}`,
          body: username,
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log('Disconnected from WebSocket');
      },
      onStompError: (frame) => {
        console.error('STOMP broker error: ' + frame.headers['message']);
        console.error('STOMP details: ' + frame.body);
      },
    });

    client.activate();
    stompClientRef.current = client;

    // Clean up connections on unmount
    return () => {
      if (stompClientRef.current) {
        // Send leave message explicitly if connected
        if (stompClientRef.current.connected) {
          try {
            stompClientRef.current.publish({
              destination: `/app/leave/${roomId}`,
              body: username,
            });
          } catch (e) {
            console.error('Error sending leave event', e);
          }
        }
        stompClientRef.current.deactivate();
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [roomId, username]);

  // Send drawing stroke
  const sendDrawAction = (action) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: `/app/draw/${roomId}`,
        body: JSON.stringify(action),
      });
    }
  };

  // Send cursor position with throttling (35ms)
  const sendCursorPosition = (x, y) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) return;

    const now = Date.now();
    const throttleLimit = 65; // 65ms interval corresponds to ~15 FPS

    const dispatchCursor = (cx, cy) => {
      if (stompClientRef.current && stompClientRef.current.connected) {
        stompClientRef.current.publish({
          destination: `/app/cursor/${roomId}`,
          body: JSON.stringify({
            type: 'CURSOR',
            username,
            x: cx,
            y: cy,
          }),
        });
      }
      lastCursorSentRef.current = Date.now();
    };

    // If enough time has passed, dispatch immediately
    if (now - lastCursorSentRef.current >= throttleLimit) {
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
        cursorTimeoutRef.current = null;
      }
      dispatchCursor(x, y);
    } else {
      // Otherwise, hold coordinates as pending and schedule
      pendingCursorRef.current = { x, y };
      
      if (!cursorTimeoutRef.current) {
        const delay = throttleLimit - (now - lastCursorSentRef.current);
        cursorTimeoutRef.current = setTimeout(() => {
          const pending = pendingCursorRef.current;
          if (pending) {
            dispatchCursor(pending.x, pending.y);
            pendingCursorRef.current = null;
          }
          cursorTimeoutRef.current = null;
        }, delay);
      }
    }
  };

  const sendUndoAction = () => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: `/app/undo/${roomId}`,
        body: username,
      });
    }
  };

  return {
    sendDrawAction,
    sendCursorPosition,
    sendUndoAction,
    isConnected,
  };
};
