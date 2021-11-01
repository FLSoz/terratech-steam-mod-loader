/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AppstoreOutlined, CloseOutlined, EditOutlined, FileTextOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Input, Layout, Row, Col, Menu, Select, Space, Button, Dropdown, Popover, Modal, Progress, Spin } from 'antd';

import { SizeMe } from 'react-sizeme';
import { Mod } from 'renderer/model/Mod';
import ModCollectionComponent from './components/ModCollectionComponent';
import { AppState } from '../model/AppState';
import { api, ValidChannel } from '../model/Api';

const { Header, Footer, Sider, Content } = Layout;
const { Option } = Select;
const { Search } = Input;

interface ModErrors {
	[id: string]: string;
}

interface MainState extends AppState {
	loadingCollectionNames?: boolean;
	loadingCollection?: boolean;
	renamingCollection?: boolean;
	savingCollection?: boolean;
	launchingGame?: boolean;
	launchGameWithErrors?: boolean;
	gameRunning?: boolean;
	acknowledgedEmptyModlist?: boolean;
	validatingMods?: boolean;
	validatedMods?: number;
	modErrors?: ModErrors;
	modalActive?: boolean;
	sidebarCollapsed?: boolean;
}

class MainView extends Component<RouteComponentProps, MainState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: RouteComponentProps) {
		super(props);
		const appState = props.location.state as AppState;
		this.state = { gameRunning: false, validatingMods: false, modErrors: undefined, sidebarCollapsed: true, launchingGame: false, ...appState };

		this.validateActiveCollection(false);
		this.handleSelectAllClick = this.handleSelectAllClick.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.setGameRunningCallback = this.setGameRunningCallback.bind(this);
		this.launchGame = this.launchGame.bind(this);
		// this.isItemSelected = this.isItemSelected.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.GAME_RUNNING, this.setGameRunningCallback);
		this.pollGameRunning();
	}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.GAME_RUNNING);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleSelectAllClick(event: any) {
		const { mods, activeCollection } = this.state;
		if (mods && activeCollection) {
			if (event.target.checked) {
				[...mods.values()].forEach((mod) => {
					activeCollection.mods.add(mod.ID);
				});
			} else {
				activeCollection.mods.clear();
			}
		}
		this.setState({});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	handleClick(event: any, id: string) {
		const { activeCollection } = this.state;
		if (activeCollection) {
			if (event.target.checked) {
				activeCollection.mods.add(id);
			} else {
				activeCollection.mods.delete(id);
			}
		}
		this.setState({});
	}

	setGameRunningCallback(running: boolean) {
		this.setState({ gameRunning: running });
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	pollGameRunning() {
		api.send(ValidChannel.GAME_RUNNING);
		setTimeout(() => {
			this.pollGameRunning();
		}, 5000);
	}

	addCollection(name: string) {
		const { allCollectionNames, allCollections } = this.state;
		allCollectionNames?.add(name);
		allCollections?.set(name, { name, mods: new Set() });
	}

	baseLaunchGame(mods: string[]) {
		const { config } = this.state;
		console.log('launching game');
		const launchPromise = api.launchGame(config!.steamExec, config!.workshopID, config!.closeOnLaunch, mods);
		if (!config?.closeOnLaunch) {
			launchPromise.finally(() => {
				this.setState({ launchingGame: false, gameRunning: true, launchGameWithErrors: false, modalActive: false });
			});
		}
	}

	launchGame() {
		this.setState({ launchingGame: true });
		this.validateActiveCollection(true);
	}

	refreshMods() {
		const { history } = this.props;
		history.push('/mods', this.state);
	}

	isItemSelected(id: string): boolean {
		const { activeCollection } = this.state;
		return activeCollection ? activeCollection.mods.has(id) : false;
	}

	updatedActiveCollection(): boolean {
		return false;
	}

	validateFunctionAsync(modList: string[]) {
		let valid = true;
		const { mods } = this.state;
		let validatedMods = 0;
		const errors: { [id: string]: string } = {};
		modList.forEach((mod) => {
			const modData = mods!.get(mod);
			if (mod) {
				if (modData?.config) {
					const dependencies = modData!.config!.dependsOn;
					if (dependencies) {
						const missingDependencies: string[] = [];
						dependencies.forEach((dependency) => {
							if (!modList.includes(dependency)) {
								missingDependencies.push(dependency);
							}
						});
						if (missingDependencies.length > 0) {
							valid = false;
							errors[mod] = `Mod ${mods} is missing dependencies ${missingDependencies.join(', ')}`;
						}
					}
				}
			} else {
				valid = false;
				errors[mod] = `Mod ${mod} does not exist!`;
			}
			validatedMods += 1;
			this.setState({ validatedMods });
		});
		if (!valid) {
			this.setState({ modErrors: errors });
		}
		return valid;
	}

	validateActiveCollection(launchIfValid: boolean) {
		const { activeCollection } = this.state;
		this.setState({ validatingMods: true, modalActive: true });
		if (activeCollection) {
			const mods = [...activeCollection!.mods];
			console.log('Selected mods:');
			console.log(mods);
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
					console.log('IS VALID:');
					console.log(isValid);
					this.setState({ validatingMods: false });
					console.log(`To launch game?: ${launchIfValid}`);
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
			console.log('NO ACTIVE COLLECTION');
			this.baseLaunchGame([]);
		}
	}

	// We allow you to load multiple mods with the same ID (bundle name), but only the local mod will be used
	// If multiple workshop mods have the same ID, and you select multiple, then we will force you to choose one to use
	renderModal() {
		const { launchingGame, launchGameWithErrors, validatingMods, validatedMods, activeCollection, modErrors, mods } = this.state;
		if (launchingGame) {
			if (validatingMods) {
				let progressPercent = 0;
				let currentMod: Mod | undefined;
				if (!activeCollection?.mods) {
					progressPercent = 100;
				} else {
					const currentlyValidatedMods = validatedMods || 0;
					progressPercent = (100 * currentlyValidatedMods) / activeCollection.mods.size;
					if (progressPercent < 100) {
						const collectionMods = [...activeCollection.mods];
						currentMod = mods?.get(collectionMods[currentlyValidatedMods]);
					}
				}
				let status: 'active' | 'exception' | 'success' = 'active';
				if (modErrors) {
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
						<Progress type="circle" percent={progressPercent} status={status} />
					</Modal>
				);
			}
			if (modErrors) {
				return (
					<Modal
						title="Errors Found in Configuration"
						visible
						closable={false}
						okText="Launch Anyway"
						cancelText="Address Errors"
						onOk={() => {
							this.setState({ launchGameWithErrors: true });
							this.baseLaunchGame(activeCollection ? [...activeCollection!.mods] : []);
						}}
						onCancel={() => {
							this.setState({ launchingGame: false, modalActive: false });
						}}
						okButtonProps={{ disabled: launchGameWithErrors, loading: launchGameWithErrors }}
						cancelButtonProps={{ disabled: launchGameWithErrors }}
					>
						<p>One or more mods have either missing dependencies, or is selected alongside incompatible mods.</p>
						<p>Launching the game with this mod list may lead to crashes, or even save game corruption.</p>
						<p>
							Mods that share the same Mod ID (Not the same as Workshop ID) are explicitly incompatible, and only the first one TerraTech loads will be used.
							All others will be ignored.
						</p>

						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			}
		}
		return null;
	}

	render() {
		const { mods, activeCollection, gameRunning, launchingGame, sidebarCollapsed, modalActive } = this.state;

		const launchGameButton = (
			<Button loading={launchingGame} disabled={gameRunning || modalActive || launchingGame} onClick={this.launchGame}>
				Launch Game
			</Button>
		);

		return (
			<div style={{ display: 'flex', width: '100%', height: '100%' }}>
				<Layout style={{ minHeight: '100vh' }}>
					<Sider
						collapsible
						collapsed={sidebarCollapsed}
						onCollapse={(collapsed) => {
							this.setState({ sidebarCollapsed: collapsed });
						}}
					>
						<div className="logo" />
						<Menu
							theme="dark"
							defaultSelectedKeys={['1']}
							mode="inline"
							disabled={launchingGame || modalActive}
							onClick={(e) => {
								const { history } = this.props;
								switch (e.key) {
									case '2':
										history.push('/raw-mods', { ...this.state, ...{ modErrors: undefined } });
										break;
									case '3':
										history.push('/settings', this.state);
										break;
									case '1':
									default:
										break;
								}
							}}
						>
							<Menu.Item key="1" icon={<AppstoreOutlined />}>
								Mod Collections
							</Menu.Item>
							<Menu.Item key="2" icon={<FileTextOutlined />}>
								Raw Modlist
							</Menu.Item>
							<Menu.Item key="3" icon={<SettingOutlined />}>
								Settings
							</Menu.Item>
						</Menu>
					</Sider>
					<Layout>
						<Header style={{ height: 120 }}>
							<Row key="row1" justify="space-between" gutter={[48, 16]}>
								<Col span={10} key="collections">
									<Select style={{ width: '100%' }}>
										<Option value="1">Modpack 1</Option>
										<Option value="2">Modpack 2</Option>
									</Select>
								</Col>
								<Space align="start">
									<Button key="rename" icon={<EditOutlined />}>
										Rename
									</Button>
									<Dropdown.Button
										key="new"
										overlay={
											<Menu>
												<Menu.Item key="duplicate">Duplicate</Menu.Item>
											</Menu>
										}
									>
										<PlusOutlined />
										New
									</Dropdown.Button>
									<Button key="delete" icon={<CloseOutlined />}>
										Delete
									</Button>
								</Space>
							</Row>
							<Row key="row2" justify="space-between" gutter={48}>
								<Col span={10} key="search">
									<Search
										placeholder="input search text"
										onSearch={(search) => {
											console.log(search);
										}}
										enterButton
									/>
								</Col>
								<Col span={8} key="right">
									Part 4
								</Col>
							</Row>
						</Header>
						{this.renderModal()}
						<SizeMe monitorHeight monitorWidth refreshMode="debounce">
							{({ size }) => {
								return (
									<Content key="collection" style={{ padding: '0px', overflowY: 'clip', overflowX: 'clip' }}>
										<Spin spinning={launchingGame} tip="Launching Game...">
											<ModCollectionComponent
												mods={mods!}
												height={size.height as number}
												width={size.width as number}
												forceUpdate={this.updatedActiveCollection()}
												collection={activeCollection!}
												setEnabledModsCallback={(enabledMods: Set<string>) => {
													if (activeCollection) {
														enabledMods.forEach((element) => {
															activeCollection?.mods.add(element);
														});
													}
												}}
												setDisabledModsCallback={(disabledMods: Set<string>) => {
													if (activeCollection) {
														disabledMods.forEach((element) => {
															activeCollection?.mods.delete(element);
														});
													}
												}}
												setAllEnabledCallback={() => {
													this.handleSelectAllClick(true);
												}}
												clearAllEnabledCallback={() => {
													this.handleSelectAllClick(false);
												}}
												setEnabledCallback={(id: string) => {
													this.handleClick(true, id);
												}}
												setDisabledCallback={(id: string) => {
													this.handleClick(false, id);
												}}
											/>
										</Spin>
									</Content>
								);
							}}
						</SizeMe>
						<Footer style={{ justifyContent: 'center', display: 'flex' }}>
							{launchingGame ? (
								<Popover content="Already launching game">{launchGameButton}</Popover>
							) : gameRunning ? (
								<Popover content="Game already running">{launchGameButton}</Popover>
							) : (
								launchGameButton
							)}
						</Footer>
					</Layout>
				</Layout>
			</div>
		);
	}
}
export default withRouter(MainView);
