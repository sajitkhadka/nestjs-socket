import { Test, TestingModule } from "@nestjs/testing";
import { AppGateway as SocketGateway } from "./app.gateway";
import * as io from "socket.io-client";
import ioServer from "socket.io";
import http from "http";
import { AddressInfo } from "net";
import { INestApplication } from "@nestjs/common";

describe("Test a nest Js Socket application", () => {
  // let app: SocketGateway;
  let client1: io.Socket;
  let client2: io.Socket;
  let gateway: SocketGateway;
  let server: ioServer.Server;
  const message = "Hello, world!";
  let address: AddressInfo;
  let baseAddress: string;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocketGateway],
    }).compile();
    app = module.createNestApplication();
    const httpServer: http.Server = app.getHttpServer();
    address = httpServer.listen().address() as AddressInfo;
    baseAddress = `http://[${address.address}]:${address.port}`;
    server = new ioServer.Server(httpServer);
    server.on("connection", (socket) => {
      socket.on("message", (data) => {
        socket.broadcast.emit("message", `${socket.id}: ${data}`);
      });
    });
    gateway = module.get<SocketGateway>(SocketGateway);
    await app.init();
  });

  afterAll((done) => {
    server.close();
    app.close().then(() => done());
  });

  afterEach(() => {
    client1?.disconnect?.();
    client2?.disconnect?.();
  });

  it("should handle incoming connections", async () => {
    client1 = io.connect(baseAddress);

    await new Promise<void>((resolve) => {
      client1.on("connect", () => {
        expect(gateway.connectedClients).toContain(client1.id);
        resolve();
      });
    });
  });

  it("should handle incoming messages", async () => {
    client1 = io.connect(baseAddress);
    client2 = io.connect(baseAddress);

    await new Promise<void>((resolve) => {
      client1.on("connect", () => {
        client1.send(message);
      });

      client2.on("message", (data: string) => {
        expect(data).toBe(`${client1.id}: ${message}`);
        resolve();
      });

      client2.on("connect", () => {
        expect(gateway.connectedClients).toContain(client1.id);
        expect(gateway.connectedClients).toContain(client2.id);
        resolve();
      });
    });
  });

  it("should handle disconnections", async () => {
    client1 = io.connect(baseAddress);
    client2 = io.connect(baseAddress);

    await new Promise<void>((resolve) => {
      client1.on("connect", () => {
        client1.disconnect();
      });
      client2.on("disconnect", () => {
        expect(gateway.connectedClients).not.toContain(client1.id);
        expect(gateway.connectedClients).not.toContain(client2.id);
        resolve();
      });
      client2.on("connect", () => {
        expect(gateway.connectedClients).toContain(client2.id);
        resolve();
      });
    });
  });
});
