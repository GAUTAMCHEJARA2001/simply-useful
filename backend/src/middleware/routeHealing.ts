import { NextFunction, Request, Response } from 'express';

const rewriteApiPath = (path: string) => {
  let nextPath = path;

  if (nextPath === '/inv') return '/';
  if (nextPath.startsWith('/inv/')) nextPath = nextPath.slice(4);

  nextPath = nextPath.replace(/^\/inventory\/(sales|purchases|approvals|returns)(?=[/?]|$)/, '/transactions/$1');

  return nextPath;
};

export const healApiRoute = (req: Request, res: Response, next: NextFunction) => {
  const apiPrefix = '/api/v1';
  if (!req.url.startsWith(apiPrefix)) return next();

  const originalUrl = req.url;
  const apiPath = originalUrl.slice(apiPrefix.length) || '/';
  const healedPath = rewriteApiPath(apiPath);

  if (healedPath !== apiPath) {
    req.url = `${apiPrefix}${healedPath}`;
    res.setHeader('x-route-healed-from', originalUrl);
  }

  next();
};
