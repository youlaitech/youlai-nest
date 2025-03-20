import { registerAs } from "@nestjs/config";

const jwtConfig = registerAs("jwt", () => ({
  secretKey: process.env.JWT_SECRET_KEY,
  expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  issuer: process.env.JWT_ISSUER,
}));

export default jwtConfig;

export type JwtConfig = ReturnType<typeof jwtConfig>;
