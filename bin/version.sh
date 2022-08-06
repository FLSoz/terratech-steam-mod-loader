#!/bin/bash
if [ $# -ge 1 ]; then
	IncrType=$1
	version=$(npm version $IncrType --no-git-tag-version)
	cd release/app
	npm version $IncrType --no-git-tag-version
	cd ../../
	git add .
	git commit -m "Bump version to $version"
	git tag $version HEAD
	if [[ $# -ge 1 && $2 -gt 0 ]]; then
		git push
		# we push the tag
		git push origin $version
	fi
else
	echo "MUST SUPPLY A VERSION INCREMENT TYPE"
fi