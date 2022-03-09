import React, { Component } from 'react';
import { AppState } from 'renderer/model/AppState';
import { Button, Col, Dropdown, Menu, Row, Select, Space, Input, Modal } from 'antd';
import {
	EditOutlined,
	PlusOutlined,
	SaveOutlined,
	DeleteOutlined,
	UndoOutlined,
	RedoOutlined,
	SyncOutlined,
	CheckCircleOutlined,
	CopyOutlined,
	ImportOutlined,
	ExportOutlined
} from '@ant-design/icons';
import { api } from 'renderer/model/Api';

const { Option } = Select;
const { Search } = Input;

enum CollectionManagementToolbarModalType {
	NEW_COLLECTION = 'new-collection',
	DUPLICATE_COLLECTION = 'duplicate-collection',
	RENAME_COLLECTION = 'rename-collection'
}

interface CollectionManagementToolbarState {
	modalType?: CollectionManagementToolbarModalType;
	modalText: string;
}

interface CollectionManagementToolbarProps {
	madeEdits: boolean;
	searchString: string;
	currentPath: string;
	appState: AppState;
	savingCollection?: boolean;
	validatingCollection?: boolean;
	numResults?: number;
	lastValidationStatus?: boolean;
	onSearchCallback: (search: string) => void;
	onSearchChangeCallback: (search: string) => void;
	saveCollectionCallback: () => void;
	validateCollectionCallback: () => void;
	changeActiveCollectionCallback: (name: string) => void;
	newCollectionCallback: (name: string) => void;
	duplicateCollectionCallback: (name: string) => void;
	deleteCollectionCallback: () => void;
	renameCollectionCallback: (name: string) => void;
}

interface CollectionManagementToolbarModalProps {
	title: string;
	okText: string;
	callback: (name: string) => void;
}

export default class CollectionManagementToolbarComponent extends Component<CollectionManagementToolbarProps, CollectionManagementToolbarState> {
	modalProps: Record<CollectionManagementToolbarModalType, CollectionManagementToolbarModalProps>;

	constructor(props: CollectionManagementToolbarProps) {
		super(props);
		const { renameCollectionCallback, newCollectionCallback, duplicateCollectionCallback } = this.props;
		this.modalProps = {
			[CollectionManagementToolbarModalType.NEW_COLLECTION]: {
				title: 'New Collection',
				okText: 'Create New Collection',
				callback: newCollectionCallback
			},
			[CollectionManagementToolbarModalType.DUPLICATE_COLLECTION]: {
				title: 'Duplicate Collection',
				okText: 'Duplicate Collection',
				callback: duplicateCollectionCallback
			},
			[CollectionManagementToolbarModalType.RENAME_COLLECTION]: {
				title: 'Rename Collection',
				okText: 'Rename Collection',
				callback: renameCollectionCallback
			}
		};
		this.state = {
			modalText: ''
		};
	}

	componentDidMount() {}

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
		const { appState } = this.props;
		const { allCollectionNames } = appState;
		const { modalType, modalText } = this.state;
		if (!modalType) {
			return null;
		}

		const modalProps: CollectionManagementToolbarModalProps = this.modalProps[modalType];

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
			validatingCollection,
			validateCollectionCallback,
			numResults,
			onSearchCallback,
			onSearchChangeCallback,
			searchString,
			madeEdits,
			lastValidationStatus
		} = this.props;
		const disabledFeatures = this.disabledFeatures();
		return (
			<div id="mod-collection-toolbar">
				{this.renderModal()}
				<Row key="row1" justify="space-between" gutter={16}>
					<Col span={20}>
						<Row gutter={16}>
							<Col span={8} key="collections">
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
											this.setState({ modalType: CollectionManagementToolbarModalType.RENAME_COLLECTION });
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
														this.setState({ modalType: CollectionManagementToolbarModalType.DUPLICATE_COLLECTION });
													}
												}}
											>
												<Menu.Item key="duplicate">Duplicate</Menu.Item>
											</Menu>
										}
										disabled={disabledFeatures}
										onClick={() => {
											this.setState({ modalType: CollectionManagementToolbarModalType.NEW_COLLECTION });
										}}
									>
										<PlusOutlined />
										New
									</Dropdown.Button>
								</Space>
							</Col>
						</Row>
					</Col>
					<Col span={4} style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
						<Space align="center">
							<Button
								shape="round"
								key="import"
								type="primary"
								icon={<ImportOutlined />}
								onClick={saveCollectionCallback}
								disabled={true || disabledFeatures || !madeEdits}
								loading={savingCollection}
							>
								Import
							</Button>
							<Button
								shape="round"
								key="export"
								type="primary"
								icon={<ExportOutlined />}
								onClick={saveCollectionCallback}
								disabled={true || disabledFeatures || !madeEdits}
								loading={savingCollection}
							>
								Export
							</Button>
							<Button
								shape="circle"
								key="copy"
								type="primary"
								icon={<CopyOutlined />}
								onClick={saveCollectionCallback}
								disabled={true || disabledFeatures || !madeEdits}
								loading={savingCollection}
							/>
							<Button
								shape="circle"
								key="save"
								type="primary"
								icon={<SaveOutlined />}
								onClick={saveCollectionCallback}
								disabled={disabledFeatures || !madeEdits}
								loading={savingCollection}
							/>
							<Button
								danger
								type="primary"
								key="delete"
								shape="circle"
								icon={<DeleteOutlined />}
								onClick={deleteCollectionCallback}
								disabled={disabledFeatures}
							/>
						</Space>
					</Col>
				</Row>
				<Row key="row2" justify="space-between" align="top" gutter={16} style={{ lineHeight: '32px' }}>
					<Col span={14}>
						<Row gutter={24}>
							<Col span={numResults !== undefined ? 18 : 24} key="search">
								<div style={{ lineHeight: '32px' }}>
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
								</div>
							</Col>
							{numResults !== undefined ? (
								<Col span={6} key="right">
									<div style={{ lineHeight: '32px' }}>
										<span>{numResults} mods found</span>
									</div>
								</Col>
							) : null}
						</Row>
					</Col>
					<Col key="tools" style={{ display: 'inline-flex', justifyContent: 'flex-end' }}>
						<Space align="center" style={{ lineHeight: '32px' }}>
							<Button key="undo" shape="circle" icon={<UndoOutlined />} disabled={disabledFeatures || true} />
							<Button key="redo" shape="circle" icon={<RedoOutlined />} disabled={disabledFeatures || true} />
							<Button
								shape="round"
								key="validate"
								type="primary"
								danger={!lastValidationStatus}
								icon={<CheckCircleOutlined />}
								disabled={disabledFeatures}
								loading={validatingCollection}
								onClick={validateCollectionCallback}
							>
								Validate
							</Button>
							<Button
								danger
								shape="round"
								key="refresh"
								type="primary"
								icon={<SyncOutlined />}
								disabled={disabledFeatures}
								onClick={() => {
									appState.updateState({ targetPathAfterLoad: '/collections/main' }, () => {
										appState.navigate('/loading/mods');
									});
								}}
							>
								Refresh
							</Button>
						</Space>
					</Col>
				</Row>
			</div>
		);
	}
}
