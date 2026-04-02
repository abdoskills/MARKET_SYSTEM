const fs = require('fs');

let seedContent = fs.readFileSync('prisma/seed.ts', 'utf-8');

seedContent = seedContent.replace(/"EG-BV-004"/g, '"EG-BV-001"');
seedContent = seedContent.replace(/"EG-GR-004"/g, '"EG-GR-002"');

fs.writeFileSync('prisma/seed.ts', seedContent, 'utf-8');
