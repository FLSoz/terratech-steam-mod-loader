// eslint-disable-next-line prettier/prettier
import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';

import './App.global.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import ConfigView from './views/ConfigView';
import MainView from './views/MainView';
import ModLoadingView from './views/ModLoadingView';

export default function App() {
	return (
		<Router>
			<Switch>
				<Route path="/" exact component={ConfigView} />
				<Route path="/mods" exact component={ModLoadingView} />
				<Route path="/main" exact component={MainView} />
			</Switch>
		</Router>
	);
}
