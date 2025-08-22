// scripts/check-prisma.mjs
try {
    await import('@prisma/client');
    console.log('✅ Prisma Client is available');
  } catch (e) {
    console.error('❌ Prisma Client not generated:', e?.message || e);
    process.exit(1);
  }
  