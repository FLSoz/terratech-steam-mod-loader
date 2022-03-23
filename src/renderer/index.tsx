import React from 'react';
import { render } from 'react-dom';
// eslint-disable-next-line prettier/prettier
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';

import './App.global.less';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import App from './App';
import ConfigLoadingView from './views/components/ConfigLoadingComponent';
import LoadingView from './views/LoadingView';
import ModsBrowserView from './views/ModsBrowserView';
import SettingsView from './views/SettingsView';
import TTQMMBrowser from './views/components/TTQMMBrowser';
import SteamBrowser from './views/components/SteamBrowser';
import CollectionManagerComponent from './views/components/CollectionManagerComponent';
import MainCollectionComponent from './views/components/MainCollectionComponent';
import RawCollectionComponent from './views/components/RawCollectionComponent';

const rootElement = document.getElementById('root');
render(
	<Router>
		<Routes>
			<Route path="/" element={<App />}>
				{/* Settings manager */}
				<Route path="settings" element={<SettingsView />} />
				{/* Paths that indicate the application is processing request to load something from disk */}
				<Route path="loading" element={<LoadingView />}>
					<Route path="config" element={<ConfigLoadingView />} />
				</Route>
				{/* The actual collection management components */}
				<Route path="collections" element={<CollectionManagerComponent />}>
					<Route path="main" element={<MainCollectionComponent />} />
					<Route path="raw-mods" element={<RawCollectionComponent />} />
				</Route>
				{/* Experimental mods browser: DISABLED */}
				<Route path="browse" element={<ModsBrowserView />}>
					<Route path="steam" element={<SteamBrowser />} />
					<Route path="ttqmm" element={<TTQMMBrowser />} />
				</Route>
			</Route>
		</Routes>
	</Router>,
	rootElement
);
