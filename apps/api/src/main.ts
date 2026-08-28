import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { parseEnvironment } from "./config/environment.js";

const environment = parseEnvironment(process.env);
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ trustProxy: true }),
  { logger: ["error", "warn", "log"] }
);
app.enableCors({ origin: [/^http:\/\/localhost:\d+$/], credentials: true });
app.setGlobalPrefix("api");
await app.listen(environment.API_PORT, "0.0.0.0");
