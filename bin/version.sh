#!/bin/bash
IncrType=$1
version=$(npm version $IncrType --no-git-tag-version)
cd release/app
npm version $IncrType --no-git-tag-version
cd ../../
git add .
git commit -m "Bump version to $version"
hash=$(git rev-parse HEAD)
git tag $version $hash
