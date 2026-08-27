import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AssessmentController } from "./assessment/assessment.controller.js";
import { AssessmentService } from "./assessment/assessment.service.js";
import { CompanionController } from "./companion/companion.controller.js";
import { CompanionService } from "./companion/companion.service.js";
import { OpenRouterProvider } from "./companion/openrouter.provider.js";
import { SafetyService } from "./companion/safety.service.js";
import { DevicesController } from "./devices/devices.controller.js";
import { DevicesService } from "./devices/devices.service.js";
import { MqttProvider } from "./devices/mqtt.provider.js";

@Module({
  controllers: [AppController, AssessmentController, CompanionController, DevicesController],
  providers: [
    AssessmentService,
    CompanionService,
    OpenRouterProvider,
    SafetyService,
    DevicesService,
    MqttProvider
  ]
})
export class AppModule {}
