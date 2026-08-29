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
  friendAcceptSchema,
  friendInviteCodeSchema,
  friendRegisterSchema,
  visitorTokenSchema
} from "@wingedhorse/contracts";
import { FriendsService } from "./friends.service.js";

@Controller("friends")
export class FriendsController {
  constructor(@Inject(FriendsService) private readonly friends: FriendsService) {}

  private token(value: string | undefined): string {
    const parsed = visitorTokenSchema.safeParse(value);
    if (!parsed.success)
      throw new UnauthorizedException({
        code: "VISITOR_TOKEN_REQUIRED",
        message: "需要有效的本机访客凭证"
      });
    return parsed.data;
  }

  @Post("register")
  register(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Body() body: unknown
  ) {
    const parsed = friendRegisterSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({
        code: "INVALID_FRIEND_REGISTER",
        message: "邀请码格式不正确"
      });
    return this.friends.register(this.token(token), parsed.data);
  }

  @Post("accept")
  accept(@Headers("x-wingedhorse-visitor-token") token: string | undefined, @Body() body: unknown) {
    const parsed = friendAcceptSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException({ code: "INVALID_FRIEND_ACCEPT", message: "邀请码格式不正确" });
    return this.friends.accept(this.token(token), parsed.data);
  }

  @Get()
  list(@Headers("x-wingedhorse-visitor-token") token: string | undefined) {
    return this.friends.list(this.token(token));
  }

  @Delete(":inviteCode")
  remove(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Param("inviteCode") inviteCode: string
  ) {
    const parsed = friendInviteCodeSchema.safeParse(inviteCode);
    if (!parsed.success)
      throw new BadRequestException({ code: "INVALID_INVITE_CODE", message: "邀请码格式不正确" });
    return this.friends.remove(this.token(token), parsed.data);
  }

  @Get(":inviteCode/events")
  async feed(
    @Headers("x-wingedhorse-visitor-token") token: string | undefined,
    @Param("inviteCode") inviteCode: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limitValue?: string
  ) {
    const parsed = friendInviteCodeSchema.safeParse(inviteCode);
    if (!parsed.success)
      throw new BadRequestException({ code: "INVALID_INVITE_CODE", message: "邀请码格式不正确" });
    const limit = limitValue ? Number(limitValue) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException({ code: "INVALID_LIMIT", message: "分页数量不正确" });
    try {
      return await this.friends.listFeed(this.token(token), parsed.data, cursor, limit);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CURSOR")
        throw new BadRequestException({ code: "INVALID_CURSOR", message: "分页游标不正确" });
      throw error;
    }
  }
}
