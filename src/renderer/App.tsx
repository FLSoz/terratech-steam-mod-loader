// eslint-disable-next-line prettier/prettier
import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';

import './App.global.css';
import BaseApp from './BaseApp';

declare global {
	interface Window {
		electron?: unknown;
	}
}

export default function App() {
	return (
		<Router>
			<Switch>
				<Route path="/" component={BaseApp} />
			</Switch>
		</Router>
	);
}
