import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import icon from '../../../assets/icon.svg';
import { DEFAULT_WORKSHOP_ID, TT_APP_ID } from '../Constants';
import { AppState } from '../model/AppState';
import { AppConfig } from '../model/AppConfig';

interface ConfigState extends AppState {
	lastConfig: AppConfig;
	loadingConfig?: boolean;
	editingConfig?: boolean;
	savingConfig?: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
	steamExec: 'E:\\Steam\\steam.exe',
	localDir: 'E:\\Steam\\steamapps\\common\\TerraTech\\LocalMods',
	workshopDir: `E:\\Steam\\steamapps\\workshop\\content\\${TT_APP_ID}`,
	/*
	steamExec: DEFAULT_STEAM_EXEC,
	localDir: DEFAULT_LOCAL_DIR,
	workshopDir: DEFAULT_WORKSHOP_DIR,
	*/
	workshopID: DEFAULT_WORKSHOP_ID,

	closeOnLaunch: false,
	language: 'english',
	activeCollection: undefined
};
class ConfigView extends Component<RouteComponentProps, ConfigState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);
		this.state = {
			config: DEFAULT_CONFIG,
			lastConfig: DEFAULT_CONFIG,
			loadingConfig: false,
			savingConfig: false,
			editingConfig: false
		};
	}

	componentDidMount() {
		this.readConfig();
		this.loadMods();
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	readConfig() {}

	loadMods() {
		const { history } = this.props;
		history.push('/mods', this.state);
	}

	render() {
		return (
			<div>
				<div className="Hello">
					<img width="200px" alt="icon" src={icon} />
				</div>
				<h1>electron-react-boilerplate</h1>
				<div className="Hello">
					<a href="https://electron-react-boilerplate.js.org/" target="_blank" rel="noreferrer">
						<button type="button">
							<span role="img" aria-label="books">
								📚
							</span>
							Read our docs
						</button>
					</a>
					<a href="https://github.com/sponsors/electron-react-boilerplate" target="_blank" rel="noreferrer">
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
export default withRouter(ConfigView);
