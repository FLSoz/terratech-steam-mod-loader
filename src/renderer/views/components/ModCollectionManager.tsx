import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Button, Col, Dropdown, Menu, Row, Select, Space, Input, Modal } from 'antd';
import { EditOutlined, PlusOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from 'renderer/model/Api';

const { Option } = Select;
const { Search } = Input;

enum ModCollectionManagerModalType {
	NEW_COLLECTION = 'new-collection',
	DUPLICATE_COLLECTION = 'duplicate-collection',
	RENAME_COLLECTION = 'rename-collection'
}

interface ModCollectionManagerState extends AppState {
	modalType?: ModCollectionManagerModalType;
	modalText: string;
}

interface ModCollectionManagerProps {
	searchString: string;
	appState: AppState;
	savingCollection?: boolean;
	numResults?: number;
	onSearchCallback: (search: string) => void;
	onSearchChangeCallback: (search: string) => void;
	saveCollectionCallback: () => void;
	changeActiveCollectionCallback: (name: string) => void;
	newCollectionCallback: (name: string) => void;
	duplicateCollectionCallback: (name: string) => void;
	deleteCollectionCallback: () => void;
	renameCollectionCallback: (name: string) => void;
}

interface ModCollectionManagerModalProps {
	title: string;
	okText: string;
	callback: (name: string) => void;
}

export default class ModCollectionManagerComponent extends Component<ModCollectionManagerProps, ModCollectionManagerState> {
	modalProps: Record<ModCollectionManagerModalType, ModCollectionManagerModalProps>;

	constructor(props: ModCollectionManagerProps) {
		super(props);
		const { appState, renameCollectionCallback, newCollectionCallback, duplicateCollectionCallback } = this.props;
		this.modalProps = {
			[ModCollectionManagerModalType.NEW_COLLECTION]: {
				title: 'New Collection',
				okText: 'Create New Collection',
				callback: newCollectionCallback
			},
			[ModCollectionManagerModalType.DUPLICATE_COLLECTION]: {
				title: 'Duplicate Collection',
				okText: 'Duplicate Collection',
				callback: duplicateCollectionCallback
			},
			[ModCollectionManagerModalType.RENAME_COLLECTION]: {
				title: 'Rename Collection',
				okText: 'Rename Collection',
				callback: renameCollectionCallback
			}
		};
		this.state = {
			...appState,
			modalText: ''
		};
	}

	componentDidMount() {}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	disabledFeatures() {
		const { modalType } = this.state;
		const { savingCollection } = this.props;
		return savingCollection || !!modalType;
	}

	opInProgress() {
		const { savingCollection } = this.props;
		return savingCollection;
	}

	renderModal() {
		const { modalType, modalText, allCollectionNames } = this.state;
		if (!modalType) {
			return null;
		}

		const modalProps: ModCollectionManagerModalProps = this.modalProps[modalType];

		return (
			<Modal
				title={modalProps.title}
				visible
				closable={false}
				okText={modalProps.okText}
				onCancel={() => {
					this.setState({ modalType: undefined, modalText: '' });
				}}
				okButtonProps={{
					disabled: modalText.length === 0 || allCollectionNames.has(modalText),
					loading: this.opInProgress()
				}}
				onOk={() => {
					this.setState({ modalText: '', modalType: undefined }, () => {
						modalProps.callback(modalText);
					});
				}}
			>
				<Input
					onChange={(evt) => {
						this.setState({ modalText: evt.target.value });
					}}
				/>
			</Modal>
		);
	}

	render() {
		const {
			deleteCollectionCallback,
			saveCollectionCallback,
			appState,
			changeActiveCollectionCallback,
			savingCollection,
			numResults,
			onSearchCallback,
			onSearchChangeCallback,
			searchString
		} = this.props;
		const disabledFeatures = this.disabledFeatures();
		return (
			<div>
				{this.renderModal()}
				<Row key="row1" justify="space-between" gutter={[48, 16]}>
					<Col span={10} key="collections">
						<Select
							style={{ width: '100%' }}
							value={appState.activeCollection!.name}
							onSelect={(value: string) => {
								changeActiveCollectionCallback(value);
							}}
						>
							{[...appState.allCollectionNames].sort().map((name: string) => {
								return (
									<Option key={name} value={name}>
										{name}
									</Option>
								);
							})}
						</Select>
					</Col>
					<Col>
						<Space align="start">
							<Button
								key="rename"
								icon={<EditOutlined />}
								onClick={() => {
									this.setState({ modalType: ModCollectionManagerModalType.RENAME_COLLECTION });
								}}
								disabled={disabledFeatures}
							>
								Rename
							</Button>
							<Dropdown.Button
								key="new"
								overlay={
									<Menu
										selectedKeys={[]}
										onClick={(e) => {
											if (e.key === 'duplicate') {
												this.setState({ modalType: ModCollectionManagerModalType.DUPLICATE_COLLECTION });
											}
										}}
									>
										<Menu.Item key="duplicate">Duplicate</Menu.Item>
									</Menu>
								}
								disabled={disabledFeatures}
								onClick={() => {
									this.setState({ modalType: ModCollectionManagerModalType.NEW_COLLECTION });
								}}
							>
								<PlusOutlined />
								New
							</Dropdown.Button>
							<Button
								shape="circle"
								key="save"
								size="large"
								type="primary"
								icon={<SaveOutlined />}
								onClick={saveCollectionCallback}
								disabled={disabledFeatures}
								loading={savingCollection}
							/>
							<Button
								danger
								type="primary"
								key="delete"
								shape="circle"
								size="large"
								icon={<DeleteOutlined />}
								onClick={deleteCollectionCallback}
								disabled={disabledFeatures}
							/>
						</Space>
					</Col>
				</Row>
				<Row key="row2" justify="space-between" gutter={48}>
					<Col span={numResults !== undefined ? 16 : 24} key="search">
						<Search
							placeholder="input search text"
							onChange={(event) => {
								onSearchChangeCallback(event.target.value);
							}}
							value={searchString}
							onSearch={(search) => {
								api.logger.info(`Searching for: ${search}`);
								onSearchCallback(search);
							}}
							enterButton
							disabled={disabledFeatures}
						/>
					</Col>
					{numResults !== undefined ? (
						<Col span={8} key="right">
							<span className="ant-input-wrapper ant-input-group" style={{ paddingTop: 6 }}>
								{numResults} mods found
							</span>
						</Col>
					) : null}
				</Row>
			</div>
		);
	}
}
