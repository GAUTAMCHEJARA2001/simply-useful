import fs from 'fs';
import path from 'path';

/**
 * SMART LOG ANALYZER (BETA)
 * Purpose: Scan backend logs for patterns and suggest fixes.
 */

const LOG_FILE = path.join(process.cwd(), 'logs/out.log'); // PM2 out file or similar

function analyze() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('📝 No logs found to analyze.');
    return;
  }

  const logs = fs.readFileSync(LOG_FILE, 'utf8').split('\n');
  const errors = logs.filter(l => l.includes('ERROR') || l.includes('warn')).slice(-10);

  console.log('\n--- 🧠 AI LOG ANALYSIS REPORT ---');
  
  if (errors.length === 0) {
    console.log('✅ System looks healthy. No recent patterns of failure.');
    return;
  }

  errors.forEach((log, i) => {
    try {
      const parsed = JSON.parse(log);
      console.log(`\n[${i+1}] Pattern: ${parsed.msg}`);
      
      if (parsed.msg.includes('ROUTE NOT FOUND')) {
        console.log(`👉 SUGGESTION: Check frontend endpoint mapping for path: ${parsed.path}`);
      } else if (parsed.prismaCode === 'P2002') {
        console.log(`👉 SUGGESTION: Database Unique Constraint Violation on ${parsed.target}. User is trying to create a duplicate.`);
      } else if (parsed.msg.includes('Record not found')) {
        console.log(`👉 SUGGESTION: Invalid ID passed to API. Data out of sync between frontend and DB.`);
      }
    } catch {
      console.log(`\n[${i+1}] Raw Log: ${log.substring(0, 100)}...`);
    }
  });

  console.log('\n--- END OF REPORT ---');
}

analyze();
