import React from 'react';
import { AppState } from 'model';
import { Outlet, useOutletContext } from 'react-router-dom';

export default () => {
	const appState: AppState = useOutletContext<AppState>();
	return <Outlet context={appState} />;
};
