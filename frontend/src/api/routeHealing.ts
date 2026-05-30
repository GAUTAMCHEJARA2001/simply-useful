import type { AxiosRequestConfig } from 'axios';

const withLeadingSlash = (url: string) => (url.startsWith('/') ? url : `/${url}`);

export const healApiPath = (url?: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;

  const [rawPath, query = ''] = url.split('?');
  let path = withLeadingSlash(rawPath);

  if (path === '/inv') path = '/';
  if (path.startsWith('/inv/')) path = path.slice(4);

  path = path.replace(/^\/inventory\/(sales|purchases|approvals|returns)(?=\/|$)/, '/transactions/$1');

  return query ? `${path}?${query}` : path;
};

export const getRouteHealCandidates = (config: AxiosRequestConfig) => {
  const healedUrl = healApiPath(config.url);
  if (!healedUrl || healedUrl === config.url) return [];
  return [healedUrl];
};
