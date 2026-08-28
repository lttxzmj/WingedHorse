import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  UnauthorizedException
} from "@nestjs/common";
import {
  lifeEventCreateSchema,
  lifeEventInteractionSchema,
  lifeSyncRequestSchema,
  visitorTokenSchema
} from "@wingedhorse/contracts";
import { LifeService } from "./life.service.js";
import { PlayerService } from "../player/player.service.js";

@Controller()
export class LifeController {
  constructor(
    @Inject(LifeService) private readonly life: LifeService,
    @Inject(PlayerService) private readonly player: PlayerService
  ) {}

  private token(value: string | undefined): string {
    const parsed = visitorTokenSchema.safeParse(value);
    if (!parsed.success)
      throw new UnauthorizedException({
        code: "VISITOR_TOKEN_REQUIRED",
        message: "需要有效的本机访客凭证"
      });
    return parsed.data;
  }

  @Post("life/events")
  create(@Headers("x-wingedhorse-visitor-token") token: string | undefined, @Body() body: unknown) {
    const parsed = lifeEventCreateSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({ code: "INVALID_LIFE_EVENT", message: "生活事件格式不正确" });
    return this.life.create(this.token(token), parsed.data);
  }

  @Post("life/sync")
  sync(@Headers("x-wingedhorse-visitor-token") token: string | undefined, @Body() body: unknown) {
    const parsed = lifeSyncRequestSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_LIFE_SYNC",
        message: "生活状态格式不正确"
      });
    return this.life.sync(this.token(token), parsed.data);
  }

  @Get("life/events")
  async list(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Query("cursor") cursor?: string,
    @Query("limit") limitValue?: string
  ) {
    const limit = limitValue ? Number(limitValue) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException({ code: "INVALID_LIMIT", message: "分页数量不正确" });
    try {
      return await this.life.list(this.token(token), cursor, limit);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CURSOR")
        throw new BadRequestException({ code: "INVALID_CURSOR", message: "分页游标不正确" });
      throw error;
    }
  }

  @Post("life/events/:id/interactions")
  interact(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    const parsed = lifeEventInteractionSchema.safeParse(body);
    if (!parsed.success || id.length < 1 || id.length > 80)
      throw new BadRequestException({
        code: "INVALID_LIFE_INTERACTION",
        message: "互动格式不正确"
      });
    return this.life.interact(this.token(token), id, parsed.data);
  }

  @Delete("account/data")
  async deleteData(@Headers("x-wingedhorse-visitor-token") token: string | undefined) {
    const visitorToken = this.token(token);
    const [{ deleted }] = await Promise.all([
      this.life.deleteAll(visitorToken),
      this.player.deleteAll(visitorToken)
    ]);
    return { deleted };
  }
}
