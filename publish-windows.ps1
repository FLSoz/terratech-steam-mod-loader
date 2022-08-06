git fetch;
if ($?) { git push };
if ($?) { git push origin v$(node --eval "process.stdout.write(require('./package.json').version)") };
if ($?) { npm run publish };