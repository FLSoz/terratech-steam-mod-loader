/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { AppstoreOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import { Layout, Select, Input, Spin, Button, Popover, Menu, Progress, Modal, Form } from 'antd';
import { useNavigate, useLocation, Location } from 'react-router-dom';

import { AppState } from 'renderer/model/AppState';
import { Mod } from 'renderer/model/Mod';
import { api, ValidChannel } from 'renderer/model/Api';
import MenuBar from './components/MenuBar';

const { Header, Footer, Sider, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

interface ModErrors {
	[id: number]: string;
}

interface RawModlistState extends AppState {
	readingLast?: boolean;
	validatingMods?: boolean;
	validatedMods?: number;
	launchingGame?: boolean;
	launchGameWithErrors?: boolean;
	gameRunning?: boolean;
	modalActive?: boolean;
	sidebarCollapsed?: boolean;
	text?: string;
	modErrors?: ModErrors;
}

class RawModlistView extends Component<{location: Location}, RawModlistState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: {location: Location}) {
		super(props);
		const appState: AppState = this.props.location.state as AppState;
		this.state = { gameRunning: false, validatingMods: false, modErrors: undefined, sidebarCollapsed: true, ...appState, launchingGame: false };

		this.launchGame = this.launchGame.bind(this);
		this.setGameRunningCallback = this.setGameRunningCallback.bind(this);
	}

	componentDidMount() {
		this.readConfig();
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		this.pollGameRunning();
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.GAME_RUNNING);
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	setGameRunningCallback(running: boolean) {
		this.setState({ gameRunning: running });
	}

	pollGameRunning() {
		api.send(ValidChannel.GAME_RUNNING);
		setTimeout(() => {
			this.pollGameRunning();
		}, 5000);
	}

	baseLaunchGame(rawModList: string[]) {
		const { config, text, mods } = this.state;
		if (text) {
			const modList: Mod[] = rawModList.map((mod) => mods!.get(mod)) as Mod[];
			const launchPromise = api.launchGame(config.steamExec, config.workshopID, config.closeOnLaunch, modList);
			if (!config?.closeOnLaunch) {
				launchPromise.finally(() => {
					this.setState({ launchingGame: false, gameRunning: true, launchGameWithErrors: false, modalActive: false });
				});
			}
		}
	}

	launchGame() {
		this.setState({ launchingGame: true });
		this.validateMods(true);
	}

	validateFunctionAsync(modList: string[]): boolean {
		const { mods } = this.state;
		const failures: { [line: number]: string } = {};
		let failed = false;
		modList.forEach(async (mod, index) => {
			const modExists = mods!.has(mod);
			if (!modExists) {
				try {
					const workshopID = parseFloat(mod);
					if (Number.isNaN(workshopID)) {
						failed = true;
						failures[index] = `Local mod ${mod} does not exist`;
					} else {
						const modDetails = await api.invoke(ValidChannel.QUERY_STEAM, BigInt(mod));
						if (!modDetails) {
							failed = true;
							failures[index] = `Mod ${mod} could not be located on the Steam Workshop`;
						}
					}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				} catch (error: any) {
					console.error(error);
					failed = true;
					failures[index] = error.toString();
				}
			}
			await setTimeout(() => {}, 500);
		});

		if (failed) {
			this.setState({ modErrors: failures });
		}
		return failed;
	}

	validateMods(launchIfValid: boolean) {
		this.setState({ validatingMods: true, modalActive: true });
		const { text } = this.state;
		if (text) {
			const mods = text!.split(/\r\n|\n\r|\n|\r/);
			const validationPromise = new Promise((resolve, reject) => {
				try {
					const isValid = this.validateFunctionAsync(mods);
					resolve(isValid);
				} catch (error) {
					reject(error);
				}
			});
			validationPromise
				.then((isValid) => {
					this.setState({ validatingMods: false });
					if (isValid && launchIfValid) {
						this.baseLaunchGame(mods);
					}
					return isValid;
				})
				.catch((error) => {
					console.error(error);
					this.setState({ validatingMods: false });
				});
		} else {
			this.baseLaunchGame([]);
		}
	}

	readConfig() {
		const { config } = this.state;
		api
			.readFile({ prefixes: [config.localDir], path: 'renderer/modlist.txt' })
			.then((res) => {
				const lines: string[] = res.split(/\r\n|\n\r|\n|\r/);
				this.setState({
					text: lines
						.map((line) => {
							const matches = line.match(/:(.*)/);
							if (matches && matches.length > 1) {
								return matches[1];
							}
							return line;
						})
						.join('\n')
				});
				return true;
			})
			.catch((error: any) => {
				console.error(error);
			})
			.finally(() => {
				this.setState({ readingLast: false });
			});
	}

	renderModal() {
		const { launchingGame, launchGameWithErrors, validatingMods, validatedMods, activeCollection, modErrors, mods, text } = this.state;
		const failed = !!modErrors;
		if (launchingGame) {
			if (validatingMods) {
				let progressPercent = 0;
				let currentMod: Mod | undefined;
				if (!activeCollection?.mods) {
					progressPercent = 100;
				} else {
					const currentlyValidatedMods = validatedMods || 0;
					progressPercent = Math.round((100 * currentlyValidatedMods) / activeCollection.mods.length);
					if (progressPercent < 100) {
						const collectionMods = [...activeCollection.mods];
						currentMod = mods?.get(collectionMods[currentlyValidatedMods]);
					}
				}
				let status: 'active' | 'exception' | 'success' = 'active';
				if (failed) {
					status = 'exception';
				} else if (progressPercent >= 100) {
					status = 'success';
				}
				return (
					<Modal title="Validating Mod Collection" visible closable={false} footer={null}>
						{currentMod ? (
							<p>Validating mod {currentMod.config?.name ? currentMod.config!.name : currentMod.ID}</p>
						) : progressPercent >= 100 ? (
							<p>All mods validated!</p>
						) : null}
						<p>
							<Progress type="circle" percent={progressPercent} status={status} />
						</p>
					</Modal>
				);
			}
			if (failed) {
				return (
					<Modal
						title="Errors Found in Configuration"
						visible
						closable={false}
						okText="Launch Anyway"
						cancelText="Address Errors"
						onOk={() => {
							this.setState({ launchGameWithErrors: true });
							this.baseLaunchGame(text ? text!.split(/\r\n|\n\r|\n|\r/) : []);
						}}
						onCancel={() => {
							this.setState({ launchingGame: false });
						}}
						okButtonProps={{ disabled: launchGameWithErrors, loading: launchGameWithErrors }}
						cancelButtonProps={{ disabled: launchGameWithErrors }}
					>
						<p>One or more local mods do not exist. Launching the game with this configuration may lead to a crash</p>

						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			}
		}
		return null;
	}

	render() {
		const { sidebarCollapsed, launchingGame, gameRunning, text, modErrors, readingLast } = this.state;
		const launchGameButton = (
			<Button loading={launchingGame} disabled={gameRunning || readingLast || launchingGame} onClick={this.launchGame}>
				Launch Game
			</Button>
		);
		let optionalHelp: string | undefined;
		if (modErrors) {
			optionalHelp = [...Object.keys(modErrors)]
				.map((key) => {
					const lineNumber: number = parseInt(key, 10);
					return `Error on line ${lineNumber}: ${modErrors[lineNumber]}`;
				})
				.join('\n');
		}

		return (
			<div style={{ display: 'flex', width: '100%', height: '100%' }}>
				<Layout style={{ minHeight: '100vh' }}>
					<Sider
						className="MenuBar"
						collapsible
						collapsed={sidebarCollapsed}
						onCollapse={(collapsed) => {
							this.setState({ sidebarCollapsed: collapsed });
						}}
					>
						<div className="logo" />
						<MenuBar
							disableNavigation={readingLast || launchingGame}
							currentTab="raw"
							appState={this.state}
						/>
					</Sider>
					<Layout style={{ width: '100%' }}>
						<Spin spinning={launchingGame} tip="Launching Game...">
							{this.renderModal()}
							<Content>
								<Form>
									<Form.Item validateStatus={modErrors ? 'error' : 'success'} help={optionalHelp}>
										<TextArea
											placeholder="Enter list of mods here. Use Mod IDs for local mods, and Workshop IDs for Workshop mods."
											autoSize
											bordered={false}
											onChange={(e) => this.setState({ text: e.target.value })}
											value={text}
											disabled={readingLast}
										/>
									</Form.Item>
								</Form>
							</Content>
							<Footer style={{ justifyContent: 'center', display: 'flex' }}>
								{readingLast ? (
									<Popover content="Reading last modlist">{launchGameButton}</Popover>
								) : launchingGame ? (
									<Popover content="Already launching game">{launchGameButton}</Popover>
								) : gameRunning ? (
									<Popover content="Game already running">{launchGameButton}</Popover>
								) : (
									launchGameButton
								)}
							</Footer>
						</Spin>
					</Layout>
				</Layout>
			</div>
		);
	}
}

export default (props: any) => {
	return <RawModlistView {...props} location={useLocation()}/>;
}
