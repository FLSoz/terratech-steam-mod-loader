import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { AppConfig } from 'renderer/model/AppConfig';
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
} from 'antd';
import { useOutletContext } from 'react-router-dom';
import { api, ValidChannel } from 'renderer/model/Api';
import { FolderOutlined } from '@ant-design/icons';
import { TT_APP_ID } from 'renderer/Constants';

const { Content } = Layout;
const { Search } = Input;

const fileRegexPath = /^(?<path>(.*[\\/])?)(?<filename>.*)$/; // taken from: https://stackoverflow.com/questions/423376/how-to-get-the-file-name-from-a-full-path-using-javascript

interface SettingsState {
	editingConfig?: AppConfig;
	selectingDirectory: boolean;
}

interface SettingsFields {
	localDir?: string;
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
			editingConfig: { ...(appState.config as AppConfig) },
			selectingDirectory: false,
		};

		this.saveChanges = this.saveChanges.bind(this);
		this.cancelChanges = this.cancelChanges.bind(this);
	}

	componentDidMount() {
		api.on(ValidChannel.SELECT_PATH_RESULT, this.setSelectedPath.bind(this));
		this.formRef.current!.resetFields();
		this.formRef.current!.validateFields();
	}

	componentDidUpdate() {}

	componentWillUnmount() {
		api.removeAllListeners(ValidChannel.SELECT_PATH_RESULT);
	}

	setSelectedPath(
		path: string,
		target: 'localDir' | 'workshopDir'
	) {
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
		updateState({ savingConfig: true });
		api
			.updateConfig(editingConfig!)
			.then(() => {
				updateState({
					config: { ...(editingConfig as AppConfig) },
					madeConfigEdits: false,
				});
				return true;
			})
			.catch((error) => {
				console.error(error);
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
			return api
				.pathExists(value)
				.catch((error) => {
					console.error(error);
					configErrors[field] = error.toString();
					updateState({});
					throw new Error(`Error while validating path:\n${error.toString()}`);
				})
				.then((success) => {
					if (!success) {
						configErrors[field] = 'Provided path is invalid';
						updateState({});
						throw new Error('Provided path is invalid');
					}
					switch (field) {
						case 'localDir':
							if (value.endsWith('LocalMods')) {
								delete configErrors[field];
								updateState({});
								return true;
							}
							configErrors[field] =
								"The local mods directory should end with 'TerraTech/LocalMods'";
							updateState({});
							return false;

						case 'workshopDir':
							if (value.endsWith(TT_APP_ID)) {
								delete configErrors[field];
								updateState({});
								return true;
							}
							configErrors[
								field
							] = `The workshop directory should end with TT app ID 'Steam/steamapps/workshop/content/${TT_APP_ID}'`;
							updateState({});
							return false;

						case 'logsDir':
							if (value.toLowerCase().includes('logs')) {
								delete configErrors[field];
								updateState({});
								return true;
							}
							configErrors[field] = "The logs directory should contain 'Logs'";
							updateState({});
							return false;

						default:
							delete configErrors[field];
							updateState({});
							return true;
					}
				});
		}
		return Promise.reject(new Error('Steam Executable Path is required'));
	}

	render() {
		const { editingConfig, selectingDirectory } = this.state;
		const { madeConfigEdits, savingConfig, configErrors, updateState } =
			this.props;
		return (
			<Layout style={{ width: '100%' }}>
				<Content className="Settings">
					<PageHeader className="site-page-header" title="Settings" />
					<Form
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						ref={this.formRef}
						onFinish={this.saveChanges}
						labelCol={{ span: 10, lg: 8, xl: 6, xxl: 4 }}
						wrapperCol={{ span: 14 }}
						initialValues={{ remember: true }}
						autoComplete="off"
						style={{
							margin: 40,
							alignContent: 'center',
							justifyContent: 'center',
						}}
						name="control-ref"
					>
						<Form.Item
							name="localDir"
							label="Local Mods Directory"
							tooltip={{
								overlayInnerStyle: { minWidth: 300 },
								title: (
									<div>
										<p>Path to TT Local Mods directory</p>
										<p>
											It will be called &quot;LocalMods&quot;, and be under
											Steam/steamapps/common/TerraTech
										</p>
									</div>
								),
							}}
							initialValue={editingConfig!.localDir}
							rules={[
								{
									required: true,
									validator: (_, value) => {
										return this.validateFile('localDir', value);
									},
								},
							]}
							help={
								configErrors && configErrors.localDir
									? configErrors.localDir
									: undefined
							}
							validateStatus={
								configErrors && configErrors.localDir ? 'error' : undefined
							}
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
										api.send(
											ValidChannel.SELECT_PATH,
											'localDir',
											true,
											'Select TerraTech LocalMods directory'
										);
										this.setState({ selectingDirectory: true });
									}
								}}
							/>
						</Form.Item>
						<Form.Item
							name="workshopDir"
							label="Steam Workshop Directory"
							tooltip={{
								overlayInnerStyle: { minWidth: 400 },
								title: (
									<div>
										<p>Path to Steam Workshop directory</p>
										<p>
											It will be under Steam/steamapps/workshop/content/285920
										</p>
									</div>
								),
							}}
							initialValue={editingConfig!.workshopDir}
							rules={[
								{
									required: true,
									validator: (_, value) => {
										return this.validateFile('workshopDir', value);
									},
								},
							]}
							help={
								configErrors && configErrors.workshopDir
									? configErrors.workshopDir
									: undefined
							}
							validateStatus={
								configErrors && configErrors.workshopDir ? 'error' : undefined
							}
						>
							<Search
								disabled={selectingDirectory}
								value={editingConfig!.workshopDir}
								enterButton={<FolderOutlined />}
								onSearch={() => {
									if (!selectingDirectory) {
										api.send(
											ValidChannel.SELECT_PATH,
											'workshopDir',
											true,
											'Select TerraTech Steam workshop directory'
										);
										this.setState({ selectingDirectory: true });
									}
								}}
								onChange={(event) => {
									editingConfig!.workshopDir = event.target.value;
									updateState({ madeConfigEdits: true });
									this.formRef.current!.setFieldsValue({
										workshopDir: event.target.value,
									});
								}}
							/>
						</Form.Item>
						<Form.Item
							name="logsDir"
							label="Logs Directory"
							initialValue={editingConfig!.logsDir}
						>
							<Search
								disabled
								value={editingConfig!.logsDir}
								enterButton={<FolderOutlined />}
								onSearch={() => {
									if (!selectingDirectory) {
										api.send(
											ValidChannel.SELECT_PATH,
											'logsDir',
											true,
											'Select directory for logs'
										);
										this.setState({ selectingDirectory: true });
									}
								}}
							/>
						</Form.Item>
						<Form.Item
							name="closeOnLaunch"
							label="Close on Game Launch"
							initialValue={editingConfig!.closeOnLaunch}
						>
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
							initialValue={editingConfig!.workshopID}
						>
							<InputNumber
								disabled
								value={editingConfig!.workshopID}
								onChange={(value) => {
									editingConfig!.workshopID = value;
									updateState({ madeConfigEdits: true });
								}}
							/>
						</Form.Item>
						<Form.Item
							name="steamMaxConcurrency"
							label="Steam API Limit"
							rules={[{ required: true }]}
							initialValue={editingConfig!.steamMaxConcurrency}
						>
							<InputNumber
								disabled
								min={0}
								max={10}
								value={editingConfig!.steamMaxConcurrency}
								onChange={(value) => {
									editingConfig!.steamMaxConcurrency = value;
									updateState({ madeConfigEdits: true });
								}}
							/>
						</Form.Item>
						<Form.Item wrapperCol={{ offset: 10 }}>
							<Space size="large" align="center">
								<Button
									loading={savingConfig}
									disabled={
										!madeConfigEdits ||
										(!!configErrors && Object.keys(configErrors).length > 0)
									}
									type="primary"
									htmlType="submit"
								>
									Save Changes
								</Button>
								<Button
									disabled={!madeConfigEdits}
									htmlType="button"
									onClick={this.cancelChanges}
								>
									Reset Changes
								</Button>
							</Space>
						</Form.Item>
					</Form>
				</Content>
			</Layout>
		);
	}
}

export default () => {
	return <SettingsView {...useOutletContext<AppState>()} />;
};
