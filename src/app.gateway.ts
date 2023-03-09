// app.gateway.ts

import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  public connectedClients: string[] = [];

  handleConnection(client: Socket) {
    this.connectedClients.push(client.id);
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients = this.connectedClients.filter(
      (id) => id !== client.id
    );
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("chat")
  handleMessage(client: Socket, message: string) {
    console.log(`Received message from ${client.id}: ${message}`);
    this.server.emit("chat", `${client.id}: ${message}`);
  }
}
