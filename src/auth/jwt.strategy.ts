import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "../config/jwt.config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.secretKey,
      issuer: config.issuer,
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    deptTreePath: string;
    roles: string[];
  }) {
    if (!payload?.sub) {
      throw new UnauthorizedException("无效的令牌载荷");
    }

    return {
      userId: payload.sub,
      username: payload.username,
      deptTreePath: payload.deptTreePath,
      roles: payload.roles,
    };
  }
}
