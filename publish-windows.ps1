git fetch;
if ($?) { git push origin $(node --eval "process.stdout.write(require('./package.json').version)") };
if ($?) { git push };
if ($?) { npm run publish };