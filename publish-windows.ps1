git fetch;
if ($?) { git push };
if ($?) {
	$VERSION=$(node --eval "process.stdout.write(require('./package.json').version)")
	$API_JSON="{`"tag_name`":`"v$VERSION`",`"target_commitish`":`"main`",`"name`":`"v$VERSION`",`"body`":`"Release of version $VERSION`",`"draft`":true,`"prerelease`":false}"
	# ,`"discussion_category_name`":`"Announcements`"
	$Headers=@{
    'Accept' = 'application/vnd.github+json';
		'Authorization' = "token $Env:GH_TOKEN"
	}
	git push origin v$VERSION
	Invoke-WebRequest -UseBasicParsing -Body "$API_JSON" -Method 'POST' -Headers $Headers -Uri "https://api.github.com/repos/FLSoz/terratech-steam-mod-loader/releases"
};
if ($?) { npm run publish };
