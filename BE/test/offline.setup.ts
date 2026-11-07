// Fail closed: tests may use in-process Supertest on loopback, never providers or PostgreSQL.
import * as net from "node:net";
import { Client, Pool } from "pg";
const denied = () => {
  throw new Error("TEST_NETWORK_BLOCKED: external network/database disabled");
};
jest.spyOn(Client.prototype, "connect").mockImplementation(denied as any);
jest.spyOn(Pool.prototype, "connect").mockImplementation(denied as any);
const connect = net.Socket.prototype.connect;
jest.spyOn(net.Socket.prototype, "connect").mockImplementation(function (
  this: net.Socket,
  ...args: any[]
) {
  const options = typeof args[0] === "object" ? args[0] : { host: args[1] };
  const host = options.host ?? "localhost";
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) return denied();
  return (connect as any).apply(this, args);
} as any);
process.env.AUTH_TOKEN_SECRET = "isolated-test-secret";
delete process.env.DATABASE_URL;
