const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
// List all model keys
const keys = Object.keys(p).filter(k => !k.startsWith('_') && !k.startsWith('$'));
console.log('Models:', keys);
p.$disconnect();
