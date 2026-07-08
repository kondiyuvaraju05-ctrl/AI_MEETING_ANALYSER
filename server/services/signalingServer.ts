import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";

interface ClientConnection {
  ws: WebSocket;
  userEmail: string;
  roomCode: string;
}

const activeClients: Map<WebSocket, ClientConnection> = new Map();

export function initSignalingServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });
  console.log("[Signaling Server] WebSocket Signaling Server initialized.");

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    
    if (pathname === "/signaling") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[Signaling Server] New client socket handshake connected.");

    ws.on("message", (message: string) => {
      try {
        const payload = JSON.parse(message.toString());
        const { type, roomCode, userEmail, data } = payload;

        switch (type) {
          case "join":
            console.log(`[Signaling Server] User [${userEmail}] joining Room [${roomCode}]`);
            activeClients.set(ws, { ws, userEmail, roomCode });
            
            // Broadcast to other peers in the room
            broadcastToRoom(roomCode, ws, {
              type: "peer-joined",
              userEmail,
              timestamp: new Date().toLocaleTimeString()
            });
            break;

          case "offer":
          case "answer":
          case "candidate":
            console.log(`[Signaling Server] Relaying WebRTC [${type}] from [${userEmail}] in Room [${roomCode}]`);
            broadcastToRoom(roomCode, ws, {
              type,
              userEmail,
              data
            });
            break;

          case "log":
            // Relay visual logs to peers
            broadcastToRoom(roomCode, ws, {
              type: "log",
              userEmail,
              data
            });
            break;

          default:
            console.warn(`[Signaling Server] Unhandled event type: ${type}`);
        }
      } catch (err) {
        console.error("[Signaling Server] Error parsing WS payload:", err);
      }
    });

    ws.on("close", () => {
      const client = activeClients.get(ws);
      if (client) {
        console.log(`[Signaling Server] Client socket disconnected: ${client.userEmail}`);
        broadcastToRoom(client.roomCode, ws, {
          type: "peer-left",
          userEmail: client.userEmail,
          timestamp: new Date().toLocaleTimeString()
        });
        activeClients.delete(ws);
      }
    });
  });
}

function broadcastToRoom(roomCode: string, senderWs: WebSocket, payload: any) {
  const payloadStr = JSON.stringify(payload);
  for (const [ws, client] of activeClients.entries()) {
    if (client.roomCode === roomCode && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payloadStr);
    }
  }
}
