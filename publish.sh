#!/bin/bash
git fetch && \
git push origin v$(node --eval "process.stdout.write(require('./package.json').version)") && \
git push && \
npm run publish