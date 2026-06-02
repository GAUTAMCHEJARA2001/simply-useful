const DB_ERROR_MARKERS = [
  "Can't reach database server",
  'ECONNREFUSED',
  'ConnectionReset',
  'connection was forcibly closed',
  'forcibly closed by the remote host',
  'P1001',
  'P1002',
  'P1008',
  'P1017',
];

export const isDbConnectionError = (error: unknown) => {
  const err = error as { message?: string; code?: string; cause?: unknown };
  const haystack = [
    err?.message,
    err?.code,
    err?.cause ? String(err.cause) : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return DB_ERROR_MARKERS.some((marker) => haystack.includes(marker));
};

export const getPrismaErrorCode = (error: unknown) => {
  const err = error as { code?: string };
  return err?.code;
};
