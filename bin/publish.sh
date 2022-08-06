#!/bin/bash
if [ $# -gt 0 ]; then
	# export GH_TOKEN=$1

	# do the build
	ts-node ./.erb/scripts/clean.js dist
	npm run build
	PLATFORM=$(node --eval "process.stdout.write(require('os').platform())")

	case $PLATFORM in
		"win32")
			echo "Building for Windows"
			electron-builder build --win --publish onTagOrDraft
			;;
		"linux")
			echo "Building for Linux"
			electron-builder build --linux --publish onTagOrDraft
			;;
		"darwin")
			echo "Building for Mac"
			electron-builder build --mac --publish onTagOrDraft
			;;
		*)
			echo "UNKNOWN PLATFORM - CANNOT PUBLISH"
			;;
	esac
else
	echo "MUST SUPPLY GH TOKEN"
fi