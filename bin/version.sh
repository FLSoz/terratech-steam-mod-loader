#!/bin/bash
if [ $# -ge 1 ]; then
	IncrType=$1
	version=$(npm version $IncrType --no-git-tag-version)
	cd release/app
	npm version $IncrType --no-git-tag-version
	cd ../../
	git add .
	git commit -m "Bump version to $version"
	git tag $version
else
	echo "MUST SUPPLY A VERSION INCREMENT TYPE"
fi