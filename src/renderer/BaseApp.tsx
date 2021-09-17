import React, { Component } from 'react';
import path from 'path';
import icon from '../../assets/icon.svg';
import { DEFAULT_WORKSHOP_ID, TT_APP_ID } from './Constants';
import { AppState } from './model/AppState';

class BaseApp extends Component<unknown, AppState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: any) {
		super(props);
		this.state = {
			config: {
				steamExec: 'E:\\Steam\\steam.exe',
				ttDir: 'E:\\Steam\\steamBaseApps\\common\\TerraTech',
				workshopDir: `E:\\Steam\\steamBaseApps\\workshop\\content\\${TT_APP_ID}`,
				closeOnLaunch: false,
				language: 'english',
				activeCollection: undefined
			},
			loadingConfig: false,
			savingConfig: false,
			editingConfig: false,

			loadingMods: false,

			loadingCollectionNames: false,

			loadingCollection: false,
			renamingCollection: false,
			savingCollection: false,

			launchingGame: false,
			allCollections: new Map(),
			allCollectionNames: new Set(),
			activeCollection: undefined,
			remoteMod: DEFAULT_WORKSHOP_ID,
			gameRunning: false,
			acknowledgedEmptyModlist: false
		};
	}

	componentDidMount() {}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	render() {
		return (
			<div>
				<div className="Hello">
					<img width="200px" alt="icon" src={icon} />
				</div>
				<h1>electron-react-boilerplate</h1>
				<div className="Hello">
					<a
						href="https://electron-react-boilerplate.js.org/"
						target="_blank"
						rel="noreferrer"
					>
						<button type="button">
							<span role="img" aria-label="books">
								📚
							</span>
							Read our docs
						</button>
					</a>
					<a
						href="https://github.com/sponsors/electron-react-boilerplate"
						target="_blank"
						rel="noreferrer"
					>
						<button type="button">
							<span role="img" aria-label="books">
								🙏
							</span>
							Donate
						</button>
					</a>
				</div>
			</div>
		);
	}
}
export default BaseApp;
