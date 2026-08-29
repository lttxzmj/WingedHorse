import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException
} from "@nestjs/common";
import {
  consumePlayerItemSchema,
  gameSessionStartSchema,
  gameSettlementSchema,
  visitorTokenSchema
} from "@wingedhorse/contracts";
import { PlayerService } from "./player.service.js";

@Controller()
export class PlayerController {
  constructor(@Inject(PlayerService) private readonly player: PlayerService) {}

  private token(value: string | undefined) {
    const parsed = visitorTokenSchema.safeParse(value);
    if (!parsed.success)
      throw new UnauthorizedException({
        code: "VISITOR_TOKEN_REQUIRED",
        message: "需要有效的本机访客凭证"
      });
    return parsed.data;
  }

  @Post("game/sessions")
  start(@Headers("x-wingedhorse-visitor-token") token: string | undefined, @Body() body: unknown) {
    const parsed = gameSessionStartSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({ code: "INVALID_GAME_START", message: "游戏初始状态不正确" });
    return this.player.start(this.token(token), parsed.data);
  }

  @Post("game/sessions/:id/settle")
  settle(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    const parsed = gameSettlementSchema.safeParse(body);
    if (!parsed.success || id.length < 16 || id.length > 80)
      throw new BadRequestException({ code: "INVALID_GAME_SETTLEMENT", message: "结算格式不正确" });
    return this.player.settle(this.token(token), id, parsed.data);
  }

  @Get("player/state")
  state(@Headers("x-wingedhorse-visitor-token") token: string | undefined) {
    return this.player.state(this.token(token));
  }

  @Post("player/items/consume")
  consume(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = consumePlayerItemSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({ code: "INVALID_ITEM", message: "物品格式不正确" });
    return this.player.consume(this.token(token), parsed.data);
  }
}
