import React, { Component } from 'react';
import { Button, Modal, Typography, Form, Switch, FormInstance, Row, Col, Divider, Input } from 'antd';
import {
	AppConfig,
	AppState,
	CollectionManagerModalType,
	CollectionViewType,
	getByUID,
	MainColumnTitles,
	ModData,
	ModType,
	NotificationProps
} from 'model';
import api from 'renderer/Api';

const { Paragraph, Title, Text } = Typography;

interface CollectionManagerModalProps {
	appState: AppState;
	modalType: CollectionManagerModalType;
	launchGameWithErrors: boolean;
	currentView: CollectionViewType;
	launchAnyway: () => void;
	openNotification: (props: NotificationProps, type?: 'info' | 'error' | 'success' | 'warn') => void;
	closeModal: () => void;
	currentRecord?: ModData;
	createNewCollection: (name: string, mods?: string[]) => void;
	deleteCollection: () => void;
}

interface CollectionManagerModalState {
	savingConfig: boolean;
}

export default class CollectionManagerModal extends Component<CollectionManagerModalProps, CollectionManagerModalState> {
	formRef = React.createRef<FormInstance>();

	constructor(props: CollectionManagerModalProps) {
		super(props);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.state = {
			savingConfig: false
		};
	}

	getModManagerUID() {
		const { appState } = this.props;
		return `${ModType.WORKSHOP}:${appState.config.workshopID}`;
	}

	render() {
		const {
			appState,
			modalType,
			launchGameWithErrors,
			launchAnyway,
			openNotification,
			currentView,
			closeModal,
			deleteCollection,
			createNewCollection
		} = this.props;
		const { mods, updateState, config } = appState;

		switch (modalType) {
			case CollectionManagerModalType.WARN_DELETE: {
				return (
					<Modal
						key="warning-modal"
						title="Delete Collection?"
						visible
						closable={false}
						footer={[
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									closeModal();
								}}
							>
								Don&apos;t Delete
							</Button>,
							<Button
								key="delete"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								loading={launchGameWithErrors}
								onClick={() => {
									deleteCollection();
									closeModal();
								}}
							>
								Delete
							</Button>
						]}
					>
						<p>Are you sure you want to delete this collection?</p>
						<p>THIS CANNOT BE UNDONE</p>
					</Modal>
				);
			}
			case CollectionManagerModalType.DESELECTING_MOD_MANAGER: {
				const managerUID = this.getModManagerUID();
				const managerData: ModData = getByUID(mods, managerUID)!;
				return (
					<Modal
						key="manager-warning-modal"
						title="Useless Operation"
						visible
						closable={false}
						footer={[
							<Button key="launch" type="primary" onClick={closeModal}>
								OK
							</Button>
						]}
					>
						<p>You are attempting to deselect the mod manager.</p>
						<p>An external mod manager is current required for TerraTech to load some mods properly.</p>
						<p>Your current selected manager is {`${managerData.name} (${config.workshopID})`}</p>
						<p>If you would like to change your manager, do so by entering the workshop file ID in the settings tab.</p>
					</Modal>
				);
			}
			case CollectionManagerModalType.ERRORS_FOUND:
				return (
					<Modal
						key="error-modal"
						title="Errors Found in Configuration"
						visible
						closable={false}
						footer={[
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									updateState({ launchingGame: false });
									closeModal();
								}}
							>
								Manually Fix
							</Button>,
							/* <Button
								key="auto-fix"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									updateState({ launchingGame: false });
									this.setState({ guidedFixActive: true });
								}}
							>
								Guided Fix
							</Button>, */
							<Button
								key="launch"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								loading={launchGameWithErrors}
								onClick={launchAnyway}
							>
								Launch Anyway
							</Button>
						]}
					>
						<p>One or more mods have either missing dependencies, or is selected alongside incompatible mods.</p>
						<p>Launching the game with this mod list may lead to crashes, or even save game corruption.</p>
						<p>
							Mods that share the same Mod ID (Not the same as Workshop ID) are explicitly incompatible, and only the first one TerraTech
							loads will be used. All others will be ignored.
						</p>

						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			case CollectionManagerModalType.WARNINGS_FOUND:
				return (
					<Modal
						key="warning-modal"
						title="Minor Errors Found in Configuration"
						visible
						closable={false}
						footer={[
							<Button
								key="cancel"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									updateState({ launchingGame: false });
									closeModal();
								}}
							>
								Manually Fix
							</Button>,
							/* <Button
								key="auto-fix"
								type="primary"
								disabled={launchGameWithErrors}
								onClick={() => {
									updateState({ launchingGame: false });
									this.setState({ guidedFixActive: true });
								}}
							>
								Guided Fix
							</Button>, */
							<Button
								key="launch"
								danger
								type="primary"
								disabled={launchGameWithErrors}
								loading={launchGameWithErrors}
								onClick={launchAnyway}
							>
								Launch Anyway
							</Button>
						]}
					>
						<p>Unable to validate one or more mods in the collection.</p>
						<p>This is probably because you are not subscribed to them.</p>
						<p>Do you want to continue anyway?</p>
					</Modal>
				);
			case CollectionManagerModalType.VIEW_SETTINGS:
				switch (currentView) {
					case CollectionViewType.MAIN: {
						const { savingConfig } = this.state;
						const { viewConfigs } = config;
						const mainConfig = viewConfigs.main;
						return (
							<Modal
								key="settings-modal"
								className="CollectionSettingsModal"
								title="Editing Collection View Settings"
								visible
								closable={false}
								footer={[
									<Button
										key="save-settings"
										loading={savingConfig}
										disabled={savingConfig}
										type="primary"
										htmlType="submit"
										onClick={() => {
											this.formRef.current?.submit();
										}}
									>
										Save Settings
									</Button>
								]}
							>
								<Form
									className="CollectionSettingsForm"
									ref={this.formRef}
									onFinish={() => {
										this.setState({ savingConfig: true }, () => {
											api
												.updateConfig(config as AppConfig)
												.catch((error) => {
													api.logger.error(error);
													openNotification(
														{
															message: 'Failed to udpate config',
															placement: 'bottomLeft',
															duration: null
														},
														'error'
													);
												})
												.finally(() => {
													this.setState({ savingConfig: false });
													closeModal();
												});
										});
									}}
								>
									<Row justify="space-between" gutter={16} className="CollectionSettings">
										<Col span={10} key="misc-settings">
											<Form.Item key="smallRows" name="smallRows" label="Compact Rows" initialValue={!!mainConfig?.smallRows}>
												<Switch
													size="small"
													checked={!!mainConfig?.smallRows}
													onChange={(checked: boolean) => {
														if (!mainConfig) {
															viewConfigs.main = {};
														}
														const actualMainConfig = viewConfigs.main!;
														actualMainConfig.smallRows = checked;
														this.setState({});
													}}
												/>
											</Form.Item>
											<Form.Item
												key="ignoreFailures"
												name="ignoreFailures"
												label="Ignore Errors"
												initialValue={!!mainConfig?.ignoreBadValidation}
											>
												<Switch
													size="small"
													checked={!!mainConfig?.ignoreBadValidation}
													onChange={(checked: boolean) => {
														if (!mainConfig) {
															viewConfigs.main = {};
														}
														const actualMainConfig = viewConfigs.main!;
														actualMainConfig.ignoreBadValidation = checked;
														this.setState({});
													}}
												/>
											</Form.Item>
										</Col>
										<Col span={1} key="divider" style={{ height: '100%' }}>
											<Divider type="vertical" orientation="center" style={{ height: '25em' }} />
										</Col>
										<Col span={13} key="columns" className="CollectionColumnSelection">
											<Paragraph>
												<Title level={5}>Select visible columns</Title>
											</Paragraph>
											{Object.values(MainColumnTitles).map((id: string) => {
												const configPresent = !!mainConfig?.columnActiveConfig;
												const colConfig: { [colID: string]: boolean } = mainConfig?.columnActiveConfig || {};
												const colPresent = colConfig[id] === undefined ? true : colConfig[id];
												const isChecked = colPresent || !configPresent;

												const cannotDisable =
													isChecked &&
													((id === MainColumnTitles.ID && (mainConfig?.columnActiveConfig || {})[MainColumnTitles.NAME] === false) ||
														(id === MainColumnTitles.NAME && (mainConfig?.columnActiveConfig || {})[MainColumnTitles.ID] === false));

												return (
													<Form.Item
														key={id}
														name={id}
														label={id}
														initialValue={isChecked}
														tooltip={
															cannotDisable
																? {
																		overlayInnerStyle: { minWidth: 300 },
																		// eslint-disable-next-line max-len
																		title: <Text>{`Must enable either the ${MainColumnTitles.ID} or ${MainColumnTitles.NAME} column`}</Text>
																  }
																: undefined
														}
													>
														<Switch
															size="small"
															checked={isChecked}
															disabled={cannotDisable}
															onChange={(checked: boolean) => {
																if (!mainConfig) {
																	viewConfigs.main = {};
																}
																const actualMainConfig = viewConfigs.main!;
																if (!configPresent) {
																	actualMainConfig.columnActiveConfig = {};
																}
																actualMainConfig.columnActiveConfig![id] = checked;
																this.setState({});
															}}
														/>
													</Form.Item>
												);
											})}
										</Col>
									</Row>
								</Form>
							</Modal>
						);
					}
					default:
						return null;
				}
				break;
			case CollectionManagerModalType.IMPORT_COLLECTION:
				createNewCollection('');
				return null;
			case CollectionManagerModalType.EXPORT_COLLECTION:
				createNewCollection('');
				return null;
			case CollectionManagerModalType.EDIT_OVERRIDES: {
				const { currentRecord } = this.props;
				const allOverrides = config.userOverrides;
				let thisOverride = allOverrides.get(currentRecord!.uid);
				if (!thisOverride) {
					thisOverride = {};
					allOverrides.set(currentRecord!.uid, thisOverride);
				}
				const { savingConfig } = this.state;
				return (
					<Modal
						key="manager-override-modal"
						title={`Edit Overrides For ${currentRecord?.name}`}
						visible
						closable={false}
						footer={[
							<Button
								key="save-settings"
								loading={savingConfig}
								disabled={savingConfig}
								type="primary"
								htmlType="submit"
								onClick={() => {
									this.formRef.current?.submit();
								}}
							>
								Save Settings
							</Button>
						]}
					>
						<Form
							className="ModOverrideForm"
							ref={this.formRef}
							onFinish={() => {
								this.setState({ savingConfig: true }, () => {
									api
										.updateConfig(config as AppConfig)
										.catch((error) => {
											api.logger.error(error);
											openNotification(
												{
													message: 'Failed to udpate config',
													placement: 'bottomLeft',
													duration: null
												},
												'error'
											);
										})
										.finally(() => {
											this.setState({ savingConfig: false });
											closeModal();
											updateState({ loadingMods: true });
										});
								});
							}}
						>
							<Row justify="space-between" gutter={16} className="ModOverrides">
								<Col span={10} key="overrides">
									<Form.Item key="override-id" name="override-id" label="Override ID" initialValue={thisOverride!.id}>
										<Input
											value={thisOverride!.id}
											onChange={(evt) => {
												thisOverride!.id = evt.target.value;
												updateState({ madeConfigEdits: true });
											}}
										/>
									</Form.Item>
									<Form.Item key="customTags" name="customTags" label="User Tags" initialValue={thisOverride!.tags}>
										<Input disabled />
									</Form.Item>
								</Col>
							</Row>
						</Form>
					</Modal>
				);
			}
			default:
				return null;
		}
	}
}
