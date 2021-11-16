// eslint-disable-next-line prettier/prettier
import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';

import './App.global.less';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import ConfigLoadingView from './views/ConfigLoadingView';
import MainView from './views/MainView';
import ModLoadingView from './views/ModLoadingView';
import RawModlistView from './views/RawModlistView';
import SettingsView from './views/SettingsView';
import TTQMMBrowser from './views/TTQMMBrowser';
import SteamBrowser from './views/SteamBrowser';

export default function App() {
	return (
		<Router>
			<Switch>
				<Route path="/" exact component={ConfigLoadingView} />
				<Route path="/settings" exact component={SettingsView} />
				<Route path="/mods" exact component={ModLoadingView} />
				<Route path="/raw-mods" exact component={RawModlistView} />
				<Route path="/main" exact component={MainView} />
				<Route path="/steam" exact component={SteamBrowser} />
				<Route path="/ttqmn" exact component={TTQMMBrowser} />
			</Switch>
		</Router>
	);
}
