/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import { Request, NextFunction } from 'express';

export function responseLogger(req: Request, res: any, next: NextFunction) {
  const initDate = Date.now();
  const oldWrite = res.write;
  const oldEnd = res.end;
  const resChunks: Uint8Array[] | Buffer[] = [];
  const forwarded = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  req.headers['custom-uuid'] = uuidv4();
  req.headers['custom-x-forwarded-for'] = forwarded;
  req.headers['custom-referer'] = req.headers.referer || undefined;
  res.write = (...restArgs: any) => {
    resChunks.push(Buffer.from(restArgs[0]));
    oldWrite.apply(res, restArgs);
  };
  res.end = (...restArgs: any) => {
    if (restArgs[0]) {
      resChunks.push(Buffer.from(restArgs[0]));
    }
    const resBody = Buffer.concat(resChunks).toString('utf8');
    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        type: 'node',
        uuid: req.headers['custom-uuid'],
        method: req.method,
        status: res.statusCode,
        protocol: req.protocol,
        host: req.hostname,
        url: req.url,
        content_type: req.url.indexOf('.') > 0 ? 'static' : 'page',
        request_body: req.body || null,
        response_time: Date.now() - initDate,
        response_length: Buffer.byteLength(resBody),
        user_agent: req.headers['user-agent'],
        http_x_forwarded_for: req.headers['custom-x-forwarded-for'],
        http_referer: req.headers['custom-referer'],
      })
    );
    oldEnd.apply(res, restArgs);
  };
  next();
}
