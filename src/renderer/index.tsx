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
import ConfigLoadingComponent from './components/loading/ConfigLoading';
import LoadingView from './views/LoadingView';
import ModsBrowserView from './views/ModsBrowserView';
import SettingsView from './views/SettingsView';
import TTQMMBrowser from './components/browser/TTQMMBrowser';
import SteamBrowser from './components/browser/SteamBrowser';
import CollectionView from './views/CollectionView';
import MainCollectionComponent from './components/collections/MainCollectionComponent';
import RawCollectionComponent from './components/collections/RawCollectionComponent';
import SteamworksVerification from './components/loading/SteamworksVerification';

const rootElement = document.getElementById('root');
render(
	<Router>
		<Routes>
			<Route path="/" element={<App />}>
				{/* Settings manager */}
				<Route path="settings" element={<SettingsView />} />
				{/* Paths that indicate the application is processing request to load something from disk */}
				<Route path="loading" element={<LoadingView />}>
					<Route path="config" element={<ConfigLoadingComponent />} />
					<Route path="steamworks" element={<SteamworksVerification />} />
				</Route>
				{/* The actual collection management components */}
				<Route path="collections" element={<CollectionView />}>
					<Route path="main" element={<MainCollectionComponent />} />
					<Route path="rawMods" element={<RawCollectionComponent />} />
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
