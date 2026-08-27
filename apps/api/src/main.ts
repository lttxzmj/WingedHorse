import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";

const port = Number(process.env.API_PORT ?? 3100);
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
  logger: ["error", "warn", "log"]
});
app.enableCors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true });
app.setGlobalPrefix("api");
await app.listen(port, "0.0.0.0");
