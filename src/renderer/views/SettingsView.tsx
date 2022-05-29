import React, { Component } from 'react';
import { AppState, AppConfig, ValidChannel, LogLevel, AppConfigKeys } from 'model';
import { Layout, Form, Input, InputNumber, Switch, Button, FormInstance, Space, PageHeader, Select, Row, Col } from 'antd';
import { useOutletContext } from 'react-router-dom';
import api from 'renderer/Api';
import { FolderOutlined } from '@ant-design/icons';
import { validateSettingsPath } from 'util/Validation';

const { Content } = Layout;
const { Search } = Input;

interface EditingConfig extends AppConfig {
	editingWorkshopID?: string;
}

interface SettingsState {
	editingConfig?: EditingConfig;
	selectingDirectory: boolean;
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
	loggingParams?: string[];
}

class SettingsView extends Component<AppState, SettingsState> {
	formRef = React.createRef<FormInstance>();

	constructor(props: AppState) {
		super(props);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const appState = props as AppState;
		this.state = {
			editingConfig: { ...(appState.config as AppConfig), editingWorkshopID: appState.config.workshopID.toString() },
			selectingDirectory: false
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
			});
	}

	cancelChanges() {
		const { config, updateState } = this.props;
		this.setState({ editingConfig: { ...(config as AppConfig) } }, () => {
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

	render() {
		const { editingConfig, selectingDirectory } = this.state;
		const { madeConfigEdits, savingConfig, configErrors, updateState } = this.props;
		return (
			<Layout style={{ width: '100%' }}>
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
											/* this.formRef.current!.setFieldsValue({
										closeOnLaunch: checked
									}); */
											updateState({ madeConfigEdits: true });
										}}
									/>
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
									<InputNumber
										value={editingConfig!.workshopID.toString()}
										onChange={(value) => {
											editingConfig!.workshopID = BigInt(value);
											updateState({ madeConfigEdits: true });
										}}
										style={{ width: 125 }}
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
										<Select.Option value={LogLevel.ERROR}>Error</Select.Option>
										<Select.Option value={LogLevel.WARN}>Warn</Select.Option>
										<Select.Option value={LogLevel.INFO}>Info</Select.Option>
										<Select.Option value={LogLevel.VERBOSE}>Verbose</Select.Option>
										<Select.Option value={LogLevel.DEBUG}>Debug</Select.Option>
										<Select.Option value={LogLevel.SILLY}>Silly</Select.Option>
									</Select>
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
							</Col>
						</Row>
						<Space size="large" align="center" style={{ justifyContent: 'center', width: '100%' }}>
							<Button disabled={!madeConfigEdits} htmlType="button" onClick={this.cancelChanges}>
								Reset Changes
							</Button>
							<Button
								loading={savingConfig}
								disabled={!madeConfigEdits || (!!configErrors && Object.keys(configErrors).length > 0)}
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
