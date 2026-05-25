import { execSync } from 'node:child_process';

const type = process.argv[2];
const validTypes = ['patch', 'minor', 'major'];

if (!type || !validTypes.includes(type)) {
  console.error('\x1b[31m%s\x1b[0m', `Error: You must provide a valid release type (${validTypes.join(', ')}).`);
  console.log('Usage: pnpm release <patch|minor|major>');
  process.exit(1);
}

try {
  console.log(`\x1b[34m%s\x1b[0m`, `Starting ${type} release...`);

  // 1. Run the versioning (creates commit and tag)
  execSync(`pnpm version ${type}`, { stdio: 'inherit' });

  // 2. Push the commit and the new tag
  execSync('git push --follow-tags', { stdio: 'inherit' });

  console.log(`\x1b[32m%s\x1b[0m`, `Successfully bumped version and pushed tags!`);
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', 'Release failed. Check your git state.');
  process.exit(1);
}
