// eslint-disable-next-line prettier/prettier
import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

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
			<Routes>
				<Route path="/" element={<ConfigLoadingView />} />
				<Route path="/settings" element={<SettingsView />} />
				<Route path="/mods" element={<ModLoadingView />} />
				<Route path="/raw-mods" element={<RawModlistView />} />
				<Route path="/main" element={<MainView />} />
				<Route path="/steam" element={<SteamBrowser />} />
				<Route path="/ttqmm" element={<TTQMMBrowser />} />
			</Routes>
		</Router>
	);
}
