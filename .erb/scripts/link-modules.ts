import fs from 'fs';
import webpackPaths from '../configs/webpack.paths';

const srcNodeModulesPath = webpackPaths.srcNodeModulesPath;
const appNodeModulesPath = webpackPaths.appNodeModulesPath

if (!fs.existsSync(srcNodeModulesPath) && fs.existsSync(appNodeModulesPath)) {
	console.log(`We assume this path doesn't exist: ${srcNodeModulesPath}`)
  fs.symlinkSync(appNodeModulesPath, srcNodeModulesPath, 'junction');
}
