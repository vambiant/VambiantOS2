import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
  databaseDir: './pg-data',
  user: 'postgres',
  password: 'postgres',
  port: 6432,
  persistent: true,
});

async function main() {
  console.log('Starting embedded PostgreSQL on port 6432...');
  await pg.initialise();
  await pg.start();
  console.log('PostgreSQL started.');

  // Create the database if it doesn't exist
  try {
    await pg.createDatabase('vambiantos2');
    console.log('Database "vambiantos2" created.');
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('Database "vambiantos2" already exists.');
    } else {
      throw e;
    }
  }

  console.log('PostgreSQL is ready at postgresql://postgres:postgres@localhost:6432/vambiantos2');
  console.log('Press Ctrl+C to stop.');

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\nStopping PostgreSQL...');
    await pg.stop();
    console.log('PostgreSQL stopped.');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch(async (err) => {
  console.error('Failed to start PostgreSQL:', err);
  try {
    await pg.stop();
  } catch {}
  process.exit(1);
});
