import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Wrap an async handler so rejections reach the Express error handler. */
export function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}
