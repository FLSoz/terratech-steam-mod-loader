import React, { Component } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { AppState } from 'renderer/model/AppState';
import { AppConfig } from 'renderer/model/AppConfig';
import { Layout, Form, Input, InputNumber, Switch, Button, FormInstance, Space } from 'antd';
import { api, ValidChannel } from 'renderer/model/Api';
import { FolderOutlined } from '@ant-design/icons';
import MenuBar from './components/MenuBar';

const { Sider, Content } = Layout;
const { Search } = Input;

interface SettingsState extends AppState {
	editingConfig: AppConfig;
	savingConfig?: boolean;
	configErrors: { [field: string]: string };
	madeEdits?: boolean;
}
class SettingsView extends Component<RouteComponentProps, SettingsState> {
	formRef = React.createRef<FormInstance>();

	constructor(props: RouteComponentProps) {
		super(props);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const passedState: any = props.location.state;
		const appState = passedState as AppState;
		const configErrors = passedState.configErrors ? passedState.configErrors : {};
		this.state = {
			editingConfig: { ...appState.config },
			...appState,
			savingConfig: false,
			configErrors
		};

		this.saveChanges = this.saveChanges.bind(this);
		this.cancelChanges = this.cancelChanges.bind(this);
	}

	componentDidMount() {
		this.formRef.current!.validateFields();
	}

	componentDidUpdate() {}

	saveChanges() {
		const { editingConfig, config } = this.state;
		this.setState({ savingConfig: true });
		api
			.updateConfig(editingConfig)
			.then(() => {
				this.setState({ config: { ...editingConfig }, madeEdits: false });
				return true;
			})
			.catch((error) => {
				console.error(error);
				this.setState({ config });
			})
			.finally(() => {
				this.setState({ savingConfig: false });
			});
	}

	cancelChanges() {
		const { config } = this.state;
		this.setState({ editingConfig: { ...config }, madeEdits: false }, () => {
			this.formRef.current!.resetFields();
		});
	}

	validateFile(field: string, value: string) {
		const { configErrors } = this.state;
		if (!!value && value.length > 0) {
			return api
				.pathExists(value)
				.catch((error) => {
					console.error(error);
					configErrors[field] = error.toString();
					this.setState({});
					throw new Error(`Error while validating path:\n${error.toString()}`);
				})
				.then((success) => {
					if (!success) {
						configErrors[field] = 'Provided path is invalid';
						this.setState({});
						throw new Error('Provided path is invalid');
					}
					delete configErrors[field];
					this.setState({});
					return true;
				});
		}
		return Promise.reject(new Error('Steam Executable Path is required'));
	}

	render() {
		const { sidebarCollapsed, editingConfig, madeEdits, savingConfig, configErrors } = this.state;
		const { history, location, match } = this.props;
		api.logger.info(editingConfig);
		api.logger.info(configErrors);
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
						<MenuBar
							disableNavigation={savingConfig || madeEdits || (!!configErrors && Object.keys(configErrors).length > 0)}
							currentTab="settings"
							history={history}
							location={location}
							match={match}
							appState={this.state}
						/>
					</Sider>
					<Layout style={{ width: '100%' }}>
						<Content>
							<Form
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								ref={this.formRef}
								onFinish={this.saveChanges}
								labelCol={{ span: 6 }}
								wrapperCol={{ span: 14 }}
								initialValues={{ remember: true }}
								autoComplete="off"
								style={{
									margin: 40,
									alignContent: 'center',
									justifyContent: 'center'
								}}
								name="control-ref"
							>
								<Form.Item
									name="steamExec"
									label="Steam Executable"
									initialValue={editingConfig.steamExec}
									rules={[
										{
											required: true,
											validator: (_, value) => {
												return this.validateFile('steamExec', value);
											}
										}
									]}
									tooltip="Path to Steam executable"
									help={configErrors.steamExec && configErrors.steamExec.startsWith('OVERRIDE:') ? configErrors.steamExec.substring(9) : undefined}
									validateStatus={configErrors.steamExec ? 'error' : undefined}
								>
									<Search
										value={editingConfig.steamExec}
										enterButton={<FolderOutlined />}
										onChange={(event) => {
											editingConfig.steamExec = event.target.value;
											this.setState({ madeEdits: true });
										}}
										onSearch={() => {
											api.send(ValidChannel.SELECT_PATH, 'steamExec');
										}}
									/>
								</Form.Item>
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
									initialValue={editingConfig.localDir}
									rules={[
										{
											required: true,
											validator: (_, value) => {
												return this.validateFile('localDir', value);
											}
										}
									]}
									help={configErrors.localDir && configErrors.localDir.startsWith('OVERRIDE:') ? configErrors.localDir.substring(9) : undefined}
									validateStatus={configErrors.localDir ? 'error' : undefined}
								>
									<Search
										value={editingConfig.localDir}
										enterButton={<FolderOutlined />}
										onChange={(event) => {
											editingConfig.localDir = event.target.value;
											this.setState({ madeEdits: true });
										}}
										onSearch={() => {
											api.send(ValidChannel.SELECT_PATH, 'localDir');
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
												<p>It will be under Steam/steamapps/workshop/content/285920</p>
											</div>
										)
									}}
									initialValue={editingConfig.workshopDir}
									rules={[
										{
											required: true,
											validator: (_, value) => {
												return this.validateFile('workshopDir', value);
											}
										}
									]}
									help={configErrors.workshopDir && configErrors.workshopDir.startsWith('OVERRIDE:') ? configErrors.workshopDir.substring(9) : undefined}
									validateStatus={configErrors.workshopDir ? 'error' : undefined}
								>
									<Search
										value={editingConfig.workshopDir}
										enterButton={<FolderOutlined />}
										onSearch={() => {
											api.send(ValidChannel.SELECT_PATH, 'workshopDir');
										}}
										onChange={(event) => {
											editingConfig.workshopDir = event.target.value;
											this.setState({ madeEdits: true });
											this.formRef.current!.setFieldsValue({ workshopDir: event.target.value });
										}}
									/>
								</Form.Item>
								<Form.Item name="logsDir" label="Logs Directory" initialValue={editingConfig.logsDir}>
									<Search
										disabled
										value={editingConfig.logsDir}
										enterButton={<FolderOutlined />}
										onSearch={() => {
											api.send(ValidChannel.SELECT_PATH, 'logsDir');
										}}
									/>
								</Form.Item>
								<Form.Item name="closeOnLaunch" label="Close on Game Launch" initialValue={editingConfig.closeOnLaunch}>
									<Switch
										checked={editingConfig.closeOnLaunch}
										onChange={(checked) => {
											editingConfig.closeOnLaunch = checked;
											/* this.formRef.current!.setFieldsValue({
												closeOnLaunch: checked
											}); */
											this.setState({ madeEdits: true });
										}}
									/>
								</Form.Item>
								<Form.Item name="workshopID" label="Workshop ID" rules={[{ required: true }]} initialValue={editingConfig.workshopID}>
									<InputNumber
										disabled
										value={editingConfig.workshopID}
										onChange={(value) => {
											editingConfig.workshopID = value;
											this.setState({ madeEdits: true });
										}}
									/>
								</Form.Item>
								<Form.Item name="steamMaxConcurrency" label="Steam API Limit" rules={[{ required: true }]} initialValue={editingConfig.steamMaxConcurrency}>
									<InputNumber
										disabled
										min={0}
										max={10}
										value={editingConfig.steamMaxConcurrency}
										onChange={(value) => {
											editingConfig.steamMaxConcurrency = value;
											this.setState({ madeEdits: true });
										}}
									/>
								</Form.Item>
								<Form.Item wrapperCol={{ offset: 10 }}>
									<Space size="large" align="center">
										<Button
											loading={savingConfig}
											disabled={!madeEdits || (!!configErrors && Object.keys(configErrors).length > 0)}
											type="primary"
											htmlType="submit"
										>
											Save Changes
										</Button>
										<Button disabled={!madeEdits} htmlType="button" onClick={this.cancelChanges}>
											Reset Changes
										</Button>
									</Space>
								</Form.Item>
							</Form>
						</Content>
					</Layout>
				</Layout>
			</div>
		);
	}
}
export default withRouter(SettingsView);
