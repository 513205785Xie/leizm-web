import { Server, ServerRequest, ServerResponse } from 'http';
import * as finalhandler from 'finalhandler';
import { Context } from './context';
import {
  Middleware, MiddlewareHandle, ErrorReason, NextFunction, ListenOptions,
  ClassicalMiddlewareHandle, ClassicalMiddlewareErrorHandle, PathRegExp,
} from './define';
import {
  isPromise, testRoute, parseRoute, getRouteParams,
} from './utils';

export class Connect {

  protected readonly stack: Middleware[] = [];
  public readonly server: Server = new Server();

  public fromClassicalHandle(fn: ClassicalMiddlewareHandle): MiddlewareHandle {
    return function (ctx: Context) {
      fn(ctx.request.req, ctx.response.res, ctx.next.bind(ctx));
    };
  }

  public fromClassicalErrorHandle(fn: ClassicalMiddlewareErrorHandle): MiddlewareHandle {
    return function (ctx: Context, err?: ErrorReason) {
      fn(err, ctx.request.req, ctx.response.res, ctx.next.bind(ctx));
    };
  }

  public use(route: string | RegExp, ...handles: MiddlewareHandle[]) {
    const info = parseRoute(route);
    for (const handle of handles) {
      this.stack.push({ route: info, handle, handleError: handle.length > 1 });
    }
  }

  public handleRequest(req: ServerRequest, res: ServerResponse, done?: (err?: ErrorReason) => void) {
    done = done || finalhandler(req, res);
    let index = 0;
    let ctx: Context;
    type GetMiddlewareHandle = () => (void | Middleware);
    const getNextHandle: GetMiddlewareHandle = () => {
      const handle = this.stack[index++];
      if (!handle) return;
      if (handle.handleError) return getNextHandle();
      return handle;
    }
    const getNextErrorHandle: GetMiddlewareHandle = () => {
      const handle = this.stack[index++];
      if (!handle) return;
      if (!handle.handleError) return getNextErrorHandle();
      return handle;
    };
    const next: NextFunction = (err) => {
      const handle = err ? getNextErrorHandle() : getNextHandle();
      if (!handle) return done(err);
      if (!testRoute(ctx.request.pathname, handle.route)) return next(err);
      if (handle.route instanceof RegExp) {
        ctx.request.params = getRouteParams(ctx.request.pathname, handle.route as PathRegExp);
      } else {
        ctx.request.params = {};
      }
      let p;
      try {
        p = handle.handle(ctx, err);
      } catch (err) {
        return next(err);
      }
      if (p && isPromise(p)) {
        p.then(() => next()).catch(next);
      }
    };
    ctx = new Context(req, res, next);
    ctx.next();
  }

  public listen(options: ListenOptions, listeningListener?: () => void) {
    this.server.on('request', this.handleRequest.bind(this));
    this.server.listen(options, listeningListener);
  }

}
