import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function requestContext(req: Request, _res: Response, next: NextFunction) {
  const forwarded = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  req.headers['custom-uuid'] = uuidv4();
  req.headers['custom-x-forwarded-for'] = forwarded;
  req.headers['custom-referer'] = req.headers.referer || undefined;
  next();
}
