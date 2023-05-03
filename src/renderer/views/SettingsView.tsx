import React, { Component } from 'react';
import { AppState, AppConfig, ValidChannel, LogLevel, AppConfigKeys, NLogLevel, SettingsViewModalType } from 'model';
import {
	Layout,
	Form,
	Input,
	InputNumber,
	Switch,
	Button,
	FormInstance,
	Space,
	PageHeader,
	Select,
	Row,
	Col,
	Divider,
	Modal,
	Tag
} from 'antd';
import { useOutletContext } from 'react-router-dom';
import api from 'renderer/Api';
import { CloseOutlined, EditFilled, FolderOutlined, PlusOutlined } from '@ant-design/icons';
import { validateSettingsPath } from 'util/Validation';

const { Content } = Layout;
const { Search } = Input;

interface LogConfig {
	level: NLogLevel;
	loggerID: string;
}

interface EditingConfig extends AppConfig {
	editingLogConfig: LogConfig[];
}

interface SettingsState {
	editingConfig: EditingConfig;
	madeLocalEdits: boolean;
	selectingDirectory: boolean;
	modalType: SettingsViewModalType;
	editingContext?: LogConfig;
}

interface SettingsFields {
	localDir?: string;
	gameExec?: string;
	workshopDir?: string;
	logsDir?: string;
	closeOnLaunch?: boolean;
	workshopID?: string;
	steamMaxConcurrency?: number;
	extraParams?: string[];
}

class SettingsView extends Component<AppState, SettingsState> {
	formRef = React.createRef<FormInstance>();

	modalFormRef = React.createRef<FormInstance>();

	constructor(props: AppState) {
		super(props);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const appState = props as AppState;
		const config = appState.config as AppConfig;
		const logConfig: LogConfig[] = [];
		if (config.logParams) {
			Object.entries(config.logParams).forEach(([loggerID, level]: [string, NLogLevel]) => {
				logConfig.push({
					loggerID,
					level
				});
			});
		}
		this.state = {
			editingConfig: { ...config, editingLogConfig: logConfig },
			selectingDirectory: false,
			madeLocalEdits: false,
			modalType: SettingsViewModalType.NONE,
			editingContext: undefined
		};

		this.saveChanges = this.saveChanges.bind(this);
		this.cancelChanges = this.cancelChanges.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.SELECT_PATH, this.setSelectedPath.bind(this));
		this.formRef.current!.resetFields();
		this.formRef.current!.validateFields();
	}

	componentDidUpdate() {}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.SELECT_PATH);
	}

	setSelectedPath(path: string, target: AppConfigKeys.LOCAL_DIR | AppConfigKeys.LOGS_DIR | AppConfigKeys.GAME_EXEC) {
		if (path) {
			const { editingConfig } = this.state;
			editingConfig![target] = path;
			this.setState({ selectingDirectory: false }, () => {
				const changedFields: SettingsFields = {};
				changedFields[target] = path;
				this.formRef.current!.setFieldsValue(changedFields);
				this.formRef.current!.validateFields();
			});
			const { updateState } = this.props;
			updateState({ madeConfigEdits: true });
		} else {
			this.setState({ selectingDirectory: false });
		}
	}

	saveChanges() {
		const { editingConfig } = this.state;
		const { config, updateState } = this.props;

		// correctly populate log level changes
		if (editingConfig.editingLogConfig.length > 0) {
			const newParams: { [loggerID: string]: NLogLevel } = {};
			editingConfig.editingLogConfig.forEach((logConfig: LogConfig) => {
				newParams[logConfig.loggerID] = logConfig.level;
			});
			editingConfig.logParams = newParams;
		}

		if (config.localDir !== editingConfig?.localDir) {
			updateState({ firstModLoad: false });
		}
		updateState({ savingConfig: true });
		api
			.updateConfig(editingConfig!)
			.then(() => {
				updateState({
					config: { ...(editingConfig as AppConfig) },
					madeConfigEdits: false
				});
				return true;
			})
			.catch((error) => {
				api.logger.error(error);
				updateState({ config });
			})
			.finally(() => {
				updateState({ savingConfig: false });
				this.setState({ madeLocalEdits: false });
			});
	}

	cancelChanges() {
		const { config, updateState } = this.props;
		const logConfig: LogConfig[] = [];
		if (config.logParams) {
			Object.entries(config.logParams).forEach(([loggerID, level]: [string, NLogLevel]) => {
				logConfig.push({
					loggerID,
					level
				});
			});
		}
		this.setState({ editingConfig: { ...(config as AppConfig), editingLogConfig: logConfig }, madeLocalEdits: false }, () => {
			this.formRef.current!.resetFields();
			this.formRef.current!.validateFields();
		});
		updateState({ madeConfigEdits: false });
	}

	validateFile(field: string, value: string) {
		const { configErrors, updateState } = this.props;
		if (!!value && value.length > 0) {
			return validateSettingsPath(field, value)
				.then((error: string | undefined) => {
					if (error !== undefined) {
						configErrors[field] = error;
					} else {
						delete configErrors[field];
					}
					updateState({});
					return !!error;
				})
				.catch((err) => {
					configErrors[field] = err.toString();
					updateState({});
				});
		}
		if (field === 'localDir') {
			return Promise.resolve(true);
		}
		return Promise.reject(new Error('Path is required'));
	}

	validateLoggerID(loggerID: string): Promise<string | undefined> {
		const { editingConfig } = this.state;
		const results = editingConfig.editingLogConfig.filter((config) => {
			return config.loggerID === loggerID;
		});
		if (results.length > 1) {
			return Promise.reject(new Error('Duplicate logger IDs'));
		}
		return Promise.resolve(undefined);
	}

	renderModal() {
		const { modalType, editingContext, editingConfig } = this.state;
		const { updateState } = this.props;
		switch (modalType) {
			case SettingsViewModalType.LOG_EDIT: {
				const config: LogConfig = editingContext as LogConfig;
				return (
					<Modal
						key="logger-name-modal"
						title="Edit Logger Name"
						visible
						closable={false}
						footer={[
							<Button
								key="save-settings"
								type="primary"
								htmlType="submit"
								onClick={() => {
									this.modalFormRef.current?.submit();
								}}
							>
								Save Settings
							</Button>
						]}
					>
						<Form
							className="LoggerNameForm"
							ref={this.modalFormRef}
							onFinish={() => {
								this.setState({ modalType: SettingsViewModalType.NONE });
							}}
						>
							<Form.Item key="logger-id" name="logger-id" label="Logger ID" initialValue={config.loggerID}>
								<Input
									value={config.loggerID}
									onChange={(evt) => {
										config.loggerID = evt.target.value;
										updateState({ madeConfigEdits: true });
									}}
								/>
							</Form.Item>
						</Form>
					</Modal>
				);
			}
			case SettingsViewModalType.WORKSHOP_ID_EDIT: {
				return (
					<Modal
						key="workshop-id-modal"
						title="Select Mod Manager"
						visible
						closable={false}
						footer={[
							<Button
								type="primary"
								key="no-changes"
								onClick={() => {
									const { config } = this.props;
									editingConfig.workshopID = config.workshopID;
									this.modalFormRef.current?.resetFields();
									this.setState({ modalType: SettingsViewModalType.NONE });
								}}
							>
								Make No Changes
							</Button>,
							<Button
								key="save-settings"
								type="primary"
								htmlType="submit"
								danger
								onClick={() => {
									this.modalFormRef.current?.submit();
								}}
							>
								Save Settings
							</Button>
						]}
					>
						<Form
							className="WorkshopIDForm"
							ref={this.modalFormRef}
							onFinish={() => {
								this.setState({ modalType: SettingsViewModalType.NONE });
							}}
						>
							<Form.Item key="workshop-id" name="workshop-id" label="Workshop ID" initialValue={editingConfig.workshopID}>
								<InputNumber
									value={editingConfig!.workshopID.toString()}
									onChange={(value) => {
										editingConfig!.workshopID = BigInt(value || 0);
										updateState({ madeConfigEdits: true });
									}}
									style={{ width: '200px' }}
								/>
							</Form.Item>
						</Form>
					</Modal>
				);
			}
			default:
				return null;
		}
	}

	render() {
		const { editingConfig, selectingDirectory, madeLocalEdits } = this.state;
		const { madeConfigEdits, savingConfig, configErrors, updateState } = this.props;
		return (
			<Layout style={{ width: '100%' }}>
				{this.renderModal()}
				<Content className="Settings">
					<PageHeader className="site-page-header" title="Settings" />
					<Form
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						ref={this.formRef}
						onFinish={this.saveChanges}
						labelCol={{ span: 12, lg: 12, xl: 9, xxl: 6 }}
						wrapperCol={{ span: 12, lg: 12, xl: 15, xxl: 18 }}
						initialValues={{ remember: true }}
						autoComplete="off"
						style={{
							margin: 20,
							alignContent: 'center',
							justifyContent: 'center'
						}}
						name="control-ref"
					>
						<Row justify="space-between" gutter={40} className="CollectionSettings" style={{ marginBottom: 10 }}>
							<Col span={12} key="misc-app-settings" className="MiscAppSettings">
								<Form.Item
									name="localDir"
									label="Local Mods Directory"
									tooltip={{
										overlayInnerStyle: { minWidth: 300 },
										title: (
											<div>
												<p>Path to TT Local Mods directory</p>
												<p>It will be called &quot;LocalMods&quot;, and be under Steam/steamapps/common/TerraTech</p>
												<p>YOU CAN LEAVE THIS BLANK</p>
												<p>This is for mod developer testing purposes</p>
											</div>
										)
									}}
									initialValue={editingConfig!.localDir}
									rules={[
										{
											validator: (_, value) => {
												return this.validateFile('localDir', value);
											}
										}
									]}
									help={configErrors && configErrors.localDir ? configErrors.localDir : undefined}
									validateStatus={configErrors && configErrors.localDir ? 'error' : undefined}
								>
									<Search
										disabled={selectingDirectory}
										value={editingConfig!.localDir}
										enterButton={<FolderOutlined />}
										onChange={(event) => {
											editingConfig!.localDir = event.target.value;
											updateState({ madeConfigEdits: true });
										}}
										onSearch={() => {
											if (!selectingDirectory) {
												api.send(ValidChannel.SELECT_PATH, 'localDir', true, 'Select TerraTech LocalMods directory');
												this.setState({ selectingDirectory: true });
											}
										}}
									/>
								</Form.Item>
								<Form.Item
									name="gameExec"
									label="TerraTech Executable"
									tooltip={{
										overlayInnerStyle: { minWidth: 300 },
										title: (
											<div>
												<p>Path to TT executable</p>
												<p>Generally, it should be under: Steam/steamapps/common/TerraTech. It varies by platform</p>
											</div>
										)
									}}
									initialValue={editingConfig!.gameExec}
									rules={[
										{
											required: true,
											validator: (_, value) => {
												return this.validateFile('gameExec', value);
											}
										}
									]}
									help={configErrors && configErrors.gameExec ? configErrors.gameExec : undefined}
									validateStatus={configErrors && configErrors.gameExec ? 'error' : undefined}
								>
									<Search
										disabled={selectingDirectory}
										value={editingConfig!.gameExec}
										enterButton={<FolderOutlined />}
										onSearch={() => {
											if (!selectingDirectory) {
												api.send(ValidChannel.SELECT_PATH, 'gameExec', false, 'Select TerraTech Executable');
												this.setState({ selectingDirectory: true });
											}
										}}
										onChange={(event) => {
											editingConfig!.gameExec = event.target.value;
											updateState({ madeConfigEdits: true });
										}}
									/>
								</Form.Item>
								<Form.Item name="logsDir" label="Logs Directory" initialValue={editingConfig!.logsDir}>
									<Search
										disabled
										value={editingConfig!.logsDir}
										enterButton={<FolderOutlined />}
										onSearch={() => {
											if (!selectingDirectory) {
												api.send(ValidChannel.SELECT_PATH, 'logsDir', true, 'Select directory for logs');
												this.setState({ selectingDirectory: true });
											}
										}}
									/>
								</Form.Item>
								<Form.Item name="closeOnLaunch" label="Close on Game Launch" initialValue={editingConfig!.closeOnLaunch}>
									<Switch
										checked={editingConfig!.closeOnLaunch}
										onChange={(checked) => {
											editingConfig!.closeOnLaunch = checked;
											updateState({ madeConfigEdits: true });
										}}
									/>
								</Form.Item>
								<Form.Item
									name="pureVanilla"
									label="Pure Vanilla"
									initialValue={editingConfig!.pureVanilla}
									tooltip={{
										overlayInnerStyle: { minWidth: 300 },
										title: (
											<div>
												<p>Should TTSMM launch the game without the integrated mod loader if no other mods are selected?</p>
											</div>
										)
									}}
								>
									<Switch
										checked={editingConfig!.pureVanilla}
										onChange={(checked) => {
											editingConfig!.pureVanilla = checked;
											updateState({ madeConfigEdits: true });
										}}
									/>
								</Form.Item>
								<Form.Item
									name="logLevel"
									label="TTSMM Logging Level"
									tooltip={{
										overlayInnerStyle: { minWidth: 300 },
										title: (
											<div>
												<p>
													How much TTSMM logs. Recommend leaving it at Warn or Error, unless specifically requested for debugging reasons
												</p>
												<p>
													This is NOT the same as the 0ModManager logging level. This will only impact how much this external application
													logs
												</p>
												<p>Changing this will NOT impact TerraTech logging. Only change this if you were EXPLICITLY TOLD to do so.</p>
											</div>
										)
									}}
									rules={[{ required: false }]}
									initialValue={editingConfig!.logLevel}
								>
									<Select
										value={editingConfig!.logLevel}
										onChange={(value) => {
											editingConfig!.logLevel = value;
											api.send(ValidChannel.UPDATE_LOG_LEVEL, value);
											updateState({ madeConfigEdits: true });
										}}
										style={{ width: 125 }}
									>
										<Select.Option value={LogLevel.ERROR}>
											<Tag color="green">ERROR</Tag>
										</Select.Option>
										<Select.Option value={LogLevel.WARN}>
											<Tag color="lime">WARN</Tag>
										</Select.Option>
										<Select.Option value={LogLevel.INFO}>
											<Tag color="blue">INFO</Tag>
										</Select.Option>
										<Select.Option value={LogLevel.VERBOSE}>
											<Tag color="yellow">VERBOSE</Tag>
										</Select.Option>
										<Select.Option value={LogLevel.DEBUG}>
											<Tag color="orange">DEBUG</Tag>
										</Select.Option>
										<Select.Option value={LogLevel.SILLY}>
											<Tag color="red">SILLY</Tag>
										</Select.Option>
									</Select>
								</Form.Item>
								<Form.Item
									name="workshopID"
									label="Workshop ID"
									rules={[{ required: true }]}
									initialValue={editingConfig!.workshopID.toString()}
									tooltip={{
										overlayInnerStyle: { minWidth: 300 },
										title: (
											<div>
												<p>Which workshop mod is used as the underlying mod manager</p>
											</div>
										)
									}}
								>
									<Input.Group compact style={{ width: '100%' }}>
										<InputNumber
											value={editingConfig!.workshopID.toString()}
											onChange={(value) => {
												editingConfig!.workshopID = BigInt(value || 0);
												updateState({ madeConfigEdits: true });
											}}
											disabled
											style={{ width: 175 }}
										/>
										<Button
											icon={<EditFilled />}
											type="primary"
											danger
											onClick={() => {
												this.setState({
													modalType: SettingsViewModalType.WORKSHOP_ID_EDIT
												});
											}}
										/>
									</Input.Group>
								</Form.Item>
							</Col>
							<Col span={12} key="additional-commands">
								<Form.Item name="extraParams" label="Additional launch Arguments" initialValue={editingConfig!.extraParams}>
									<Input
										value={editingConfig!.extraParams}
										onChange={(evt) => {
											editingConfig!.extraParams = evt.target.value;
											updateState({ madeConfigEdits: true });
										}}
									/>
								</Form.Item>
								<Divider>TTLogManager Logging Configs</Divider>
								{editingConfig.editingLogConfig.map((config: LogConfig, index: number) => {
									const id = `${config.loggerID}-${index}`;
									return (
										<Form.Item
											name={id}
											key={id}
											label={`Config ${index}`}
											initialValue={config.loggerID}
											rules={[
												{
													validator: (_, value: string) => {
														return this.validateLoggerID(value);
													}
												}
											]}
											style={{ width: '100%' }}
										>
											<Space style={{ width: '100%' }}>
												<Select
													value={config.level}
													onChange={(value) => {
														config.level = value;
														updateState({ madeConfigEdits: true });
													}}
													style={{ width: 125 }}
												>
													<Select.Option value={NLogLevel.OFF}>
														<Tag>OFF</Tag>
													</Select.Option>
													<Select.Option value={NLogLevel.FATAL}>
														<Tag color="green">FATAL</Tag>
													</Select.Option>
													<Select.Option value={NLogLevel.ERROR}>
														<Tag color="lime">ERROR</Tag>
													</Select.Option>
													<Select.Option value={NLogLevel.WARN}>
														<Tag color="cyan">WARN</Tag>
													</Select.Option>
													<Select.Option value={NLogLevel.INFO}>
														<Tag color="blue">INFO</Tag>
													</Select.Option>
													<Select.Option value={NLogLevel.DEBUG}>
														<Tag color="orange">DEBUG</Tag>
													</Select.Option>
													<Select.Option value={NLogLevel.TRACE}>
														<Tag color="red">TRACE</Tag>
													</Select.Option>
												</Select>
												<Input.Group compact style={{ width: '100%' }}>
													<Input style={{ width: 'calc(100% - 50px)' }} value={config.loggerID} disabled />
													<Button
														icon={<EditFilled />}
														type="primary"
														onClick={() => {
															this.setState({
																modalType: SettingsViewModalType.LOG_EDIT,
																editingContext: config
															});
														}}
													/>
												</Input.Group>
												<Button
													icon={<CloseOutlined />}
													danger
													type="primary"
													onClick={() => {
														editingConfig.editingLogConfig.splice(index, 1);
														updateState({ madeConfigEdits: true });
													}}
												/>
											</Space>
										</Form.Item>
									);
								})}
								<span style={{ justifyContent: 'center', display: 'flex' }}>
									<Button
										icon={<PlusOutlined />}
										onClick={() => {
											editingConfig.editingLogConfig.push({ loggerID: '', level: NLogLevel.ERROR });
											updateState({ madeConfigEdits: true });
										}}
										type="primary"
									>
										Add New Logging Config
									</Button>
								</span>
							</Col>
						</Row>
						<Space size="large" align="center" style={{ justifyContent: 'center', width: '100%' }}>
							<Button disabled={!madeConfigEdits && !madeLocalEdits} htmlType="button" onClick={this.cancelChanges}>
								Reset Changes
							</Button>
							<Button
								loading={savingConfig}
								disabled={(!madeConfigEdits && !madeLocalEdits) || (!!configErrors && Object.keys(configErrors).length > 0)}
								onClick={() => {
									this.formRef.current?.submit();
								}}
								type="primary"
								htmlType="submit"
							>
								Save Changes
							</Button>
						</Space>
					</Form>
				</Content>
			</Layout>
		);
	}
}

export default () => {
	return <SettingsView {...useOutletContext<AppState>()} />;
};
