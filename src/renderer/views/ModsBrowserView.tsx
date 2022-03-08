import React from 'react';
import { AppState } from 'renderer/model/AppState';
import { Outlet, useOutletContext } from 'react-router-dom';

export default (props: any) => {
	const appState: AppState = useOutletContext<AppState>();
	return <Outlet context={appState} />;
}
