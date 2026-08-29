import { Module } from "@nestjs/common";
import { AnalyticsRepository } from "./analytics/analytics.repository.js";
import { AppController } from "./app.controller.js";
import { AssessmentController } from "./assessment/assessment.controller.js";
import { AssessmentService } from "./assessment/assessment.service.js";
import { CompanionController } from "./companion/companion.controller.js";
import { CompanionAccessService } from "./companion/companion-access.service.js";
import { CompanionRedisStore } from "./companion/companion-redis.store.js";
import { CompanionService } from "./companion/companion.service.js";
import { OpenRouterProvider } from "./companion/openrouter.provider.js";
import { SafetyService } from "./companion/safety.service.js";
import { DevicesController } from "./devices/devices.controller.js";
import { DevicesService } from "./devices/devices.service.js";
import { MqttProvider } from "./devices/mqtt.provider.js";
import { LifeController } from "./life/life.controller.js";
import { LifeRepository } from "./life/life.repository.js";
import { LifeService } from "./life/life.service.js";
import { PlayerController } from "./player/player.controller.js";
import { PlayerRepository } from "./player/player.repository.js";
import { PlayerService } from "./player/player.service.js";

@Module({
  controllers: [
    AppController,
    AssessmentController,
    CompanionController,
    DevicesController,
    LifeController,
    PlayerController
  ],
  providers: [
    AnalyticsRepository,
    AssessmentService,
    CompanionAccessService,
    CompanionRedisStore,
    CompanionService,
    OpenRouterProvider,
    SafetyService,
    DevicesService,
    MqttProvider,
    LifeRepository,
    LifeService,
    PlayerRepository,
    PlayerService
  ]
})
export class AppModule {}
