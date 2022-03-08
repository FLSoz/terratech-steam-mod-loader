import React from 'react';
import { AppState } from 'renderer/model/AppState';
import { Outlet, useOutletContext } from 'react-router-dom';

export default () => {
	const appState: AppState = useOutletContext<AppState>();
	return <Outlet context={appState} />;
};
