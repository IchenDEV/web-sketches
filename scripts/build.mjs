import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
process.chdir(fileURLToPath(root));
await rm('_site', { recursive: true, force: true });
await mkdir('_site/projects', { recursive: true });
await cp('index.html', '_site/index.html');
await cp('previews', '_site/previews', { recursive: true });
await writeFile('_site/.nojekyll', '');

for (const project of await readdir('projects', { withFileTypes: true })) {
  if (!project.isDirectory() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.name)) continue;
  const directory = join('projects', project.name);
  const hasPackage = await stat(join(directory, 'package.json')).then(() => true, () => false);
  if (hasPackage) {
    execFileSync('npm', ['run', 'build', '--workspace', directory], { stdio: 'inherit' });
  }
  const source = hasPackage ? join(directory, 'dist') : directory;
  await stat(join(source, 'index.html'));
  await cp(source, join('_site', directory), {
    recursive: true,
    filter: path => !path.split(/[\\/]/).some(part => part.startsWith('.') || part === 'node_modules'),
  });
}
console.log('Pages site built in _site/');
