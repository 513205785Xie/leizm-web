import * as originCookieParser from "cookie-parser";
import { Context } from "./context";

export interface CookieParserOptions {
  secret?: string;
  decode?: (val: string) => string;
}

export function cookieParser(options: CookieParserOptions) {
  const handler = originCookieParser(options.secret, { decode: options.decode });
  return function(ctx: Context) {
    handler(ctx.request.req as any, ctx.response.res as any, (err?: Error) => ctx.next(err));
  };
}