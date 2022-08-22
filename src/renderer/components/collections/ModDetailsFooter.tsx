/* eslint-disable no-nested-ternary */
import React, { Component } from 'react';
import {
	Empty,
	Layout,
	Button,
	Typography,
	Col,
	Row,
	Tabs,
	Image,
	Space,
	Card,
	PageHeader,
	Descriptions,
	Tag,
	Collapse,
	Table,
	Checkbox,
	Tooltip,
	ConfigProvider
} from 'antd';
import {
	CheckSquareFilled,
	ClockCircleTwoTone,
	CloseOutlined,
	EditFilled,
	FolderOpenFilled,
	FullscreenExitOutlined,
	FullscreenOutlined,
	HddFilled,
	QuestionCircleFilled,
	QuestionCircleOutlined,
	QuestionCircleTwoTone,
	StopTwoTone,
	WarningTwoTone
} from '@ant-design/icons';
import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import api from 'renderer/Api';
import {
	AppConfig,
	AppState,
	DisplayModData,
	getDescriptor,
	ModCollection,
	ModErrors,
	ModErrorType,
	ModType,
	NotificationProps,
	getModDataId,
	CollectionManagerModalType
} from 'model';
import { formatDateStr } from 'util/Date';

import missing from '../../../../assets/missing.png';

import steam from '../../../../assets/steam.png';
import ttmm from '../../../../assets/ttmm.png';

const { Content } = Layout;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Text, Paragraph } = Typography;

function getImageSrcFromType(type: ModType, size = 15) {
	switch (type) {
		case ModType.LOCAL:
			return (
				<Tooltip title="This is a local mod">
					<HddFilled width={size} />
				</Tooltip>
			);
		case ModType.TTQMM:
			return (
				<Tooltip title="This is a TTMM mod">
					<img src={ttmm} width={size} alt="" key="type" />
				</Tooltip>
			);
		case ModType.WORKSHOP:
			return (
				<Tooltip title="This is a Steam mod">
					<img src={steam} width={size} alt="" key="type" />
				</Tooltip>
			);
		default:
			return null;
	}
}

function getImagePreview(path?: string) {
	return (
		<Card className="ModDetailFooterPreview" style={{ width: '100%', padding: 10 }}>
			<Image src={path} fallback={missing} width="100%" />
		</Card>
	);
}

enum DependenciesTableType {
	REQUIRED = 0,
	DEPENDENT = 1,
	CONFLICT = 2
}

interface ModDetailsFooterProps {
	bigDetails: boolean;
	lastValidationStatus?: boolean;
	appState: AppState;
	currentRecord: DisplayModData;
	expandFooterCallback: (expand: boolean) => void;
	closeFooterCallback: () => void;
	// eslint-disable-next-line react/no-unused-prop-types
	enableModCallback: (uid: string) => void;
	// eslint-disable-next-line react/no-unused-prop-types
	disableModCallback: (uid: string) => void;
	setModSubsetCallback: (changes: { [uid: string]: boolean }) => void;
	openNotification: (props: NotificationProps, type?: 'info' | 'error' | 'success' | 'warn') => void;
	validateCollection: () => void;
	openModal: (modalType: CollectionManagerModalType) => void;
}

// Dependencies display schemas
const NAME_SCHEMA: ColumnType<DisplayModData> = {
	title: 'Name',
	dataIndex: 'name',
	defaultSortOrder: 'ascend',
	sorter: (a: DisplayModData, b: DisplayModData) => {
		if (a.name) {
			if (b.name) {
				return a.name > b.name ? 1 : -1;
			}
			return 1;
		}
		if (b.name) {
			return -1;
		}
		return 0;
	},
	render: (name: string, record: DisplayModData) => {
		if (record.type === ModType.DESCRIPTOR && record.children && record.children.length > 0) {
			return (
				<span>
					<FolderOpenFilled /> {name}
				</span>
			);
		}
		let updateIcon = null;
		let updateType: 'danger' | 'warning' | undefined;
		if (record.needsUpdate) {
			updateIcon = (
				<Tooltip title="Needs update">
					<WarningTwoTone twoToneColor="red" />
				</Tooltip>
			);
			updateType = 'danger';
			if (record.downloadPending) {
				updateIcon = (
					<Tooltip title="Download pending">
						<ClockCircleTwoTone twoToneColor="orange" />
					</Tooltip>
				);
				updateType = 'warning';
			}
			if (record.downloading) {
				updateIcon = (
					<Tooltip title="Downloading">
						<StopTwoTone spin twoToneColor="orange" />
					</Tooltip>
				);
				updateType = 'warning';
			}
		}
		return (
			<span>
				{updateIcon}
				<Text strong={record.needsUpdate} type={updateType}>{` ${name}`}</Text>
			</span>
		);
	}
};
const TYPE_SCHEMA: ColumnType<DisplayModData> = {
	title: 'Type',
	dataIndex: 'type',
	render: (type: ModType) => getImageSrcFromType(type, 20),
	width: 65,
	align: 'center'
};
const AUTHORS_SCHEMA: ColumnType<DisplayModData> = {
	title: 'Authors',
	dataIndex: 'authors',
	defaultSortOrder: 'ascend',
	sorter: (a, b) => {
		const v1 = a;
		const v2 = b;
		if (v1.authors) {
			if (v2.authors) {
				const l1 = v1.authors.length;
				const l2 = v2.authors.length;
				let ind = 0;
				while (ind < l1 && ind < l2) {
					if (v1.authors[ind] > v2.authors[ind]) {
						return 1;
					}
					if (v1.authors[ind] < v2.authors[ind]) {
						return -1;
					}
					ind += 1;
				}
				if (l1 > l2) {
					return 1;
				}
				if (l1 < l2) {
					return -1;
				}
				return 0;
			}
			return 1;
		}
		return -1;
	},
	// eslint-disable-next-line @typescript-eslint/ban-types
	render: (authors: string[] | undefined) => {
		return (authors || []).map((author) => {
			return <Tag key={author}>{author}</Tag>;
		});
	}
};
const ID_SCHEMA: ColumnType<DisplayModData> = {
	title: 'ID',
	dataIndex: 'id',
	sorter: (a, b) => {
		const a_id = getModDataId(a);
		const b_id = getModDataId(b);
		if (a_id) {
			if (b_id) {
				return a_id > b_id ? 1 : -1;
			}
			return 1;
		}
		if (b_id) {
			return -1;
		}
		return 0;
	}
};

// eslint-disable-next-line @typescript-eslint/ban-types
export default class ModDetailsFooter extends Component<ModDetailsFooterProps, {}> {
	constructor(props: ModDetailsFooterProps) {
		super(props);
		this.state = {};
	}

	getDependenciesSchema(tableType: DependenciesTableType) {
		const { appState, lastValidationStatus, currentRecord } = this.props;

		const STATE_SCHEMA: ColumnType<DisplayModData> = {
			title: 'State',
			dataIndex: 'errors',
			render: (errors: ModErrors | undefined, record: DisplayModData) => {
				const collection = appState.activeCollection as ModCollection;
				const selectedMods = collection.mods;

				// Handle folder item
				if (record.type === ModType.DESCRIPTOR) {
					const children = record.children?.map((data) => data.uid) || [];
					const selectedChildren = children.filter((uid) => selectedMods.includes(uid));
					if (selectedChildren.length > 1) {
						return <Tag color="red">Conflicts</Tag>;
					}
				}

				if (!selectedMods.includes(record.uid)) {
					if (!record.subscribed && record.workshopID && record.workshopID > 0) {
						return <Tag key="notSubscribed">Not subscribed</Tag>;
					}
					if (record.subscribed && !record.installed) {
						return <Tag key="notInstalled">Not installed</Tag>;
					}
					return null;
				}
				const errorTags: { text: string; color: string }[] = [];
				if (errors) {
					if (errors.incompatibleMods && errors.incompatibleMods.length > 0) {
						errorTags.push({
							text: 'Conflicts',
							color: 'red'
						});
					}
					if (errors.invalidId) {
						errorTags.push({
							text: 'Invalid ID',
							color: 'volcano'
						});
					}
					if (errors.missingDependencies && errors.missingDependencies.length > 0) {
						errorTags.push({
							text: 'Missing dependencies',
							color: 'orange'
						});
					}

					// Installation status errors
					if (errors.notSubscribed) {
						errorTags.push({
							text: 'Not subscribed',
							color: 'yellow'
						});
					} else if (errors.notInstalled) {
						errorTags.push({
							text: 'Not installed',
							color: 'yellow'
						});
					} else if (errors.needsUpdate) {
						errorTags.push({
							text: 'Needs update',
							color: 'yellow'
						});
					}
				}
				if (errorTags.length > 0) {
					return errorTags.map((tagConfig) => {
						return (
							<Tag key={tagConfig.text} color={tagConfig.color}>
								{tagConfig.text}
							</Tag>
						);
					});
				}

				// If everything is fine, only return OK if we have actually validated it
				if (lastValidationStatus !== undefined && !!errors) {
					return (
						<Tag key="OK" color="green">
							OK
						</Tag>
					);
				}
				return null;
			}
		};
		const AUTHOR_SPECIFIED_DEPENDENCY_SCHEMA: ColumnType<DisplayModData> = {
			title: (
				<Tooltip title={'Which version of the mod did the author say is the canonical dependency?'}>
					<QuestionCircleFilled />
				</Tooltip>
			),
			dataIndex: 'workshopID',
			render: (workshopID: bigint | undefined) => {
				if (!!workshopID && currentRecord.steamDependencies?.includes(workshopID)) {
					return (
						<Tooltip title={'This is the mod the author specified as the canonical dependency'}>
							<CheckSquareFilled />
						</Tooltip>
					);
				}
				return null;
			},
			width: 30,
			align: 'center'
		};

		const DESCRIPTOR_COLUMN_SCHEMA: ColumnType<DisplayModData>[] = [NAME_SCHEMA];

		if (tableType === DependenciesTableType.REQUIRED) {
			DESCRIPTOR_COLUMN_SCHEMA.push(AUTHOR_SPECIFIED_DEPENDENCY_SCHEMA);
		}
		[TYPE_SCHEMA, AUTHORS_SCHEMA, STATE_SCHEMA, ID_SCHEMA].forEach((schema) => DESCRIPTOR_COLUMN_SCHEMA.push(schema));

		const ignoredRenderer = this.getIgnoredRenderer(tableType);
		if (ignoredRenderer) {
			DESCRIPTOR_COLUMN_SCHEMA.push({
				title: 'Ignored',
				render: ignoredRenderer
			});
		}
		return DESCRIPTOR_COLUMN_SCHEMA;
	}

	getIgnoredRenderer(type: DependenciesTableType) {
		const { appState, currentRecord, openNotification } = this.props;
		const { config, updateState } = appState;
		const ignoreBadValidation: Map<ModErrorType, { [uid: string]: string[] }> = config.ignoredValidationErrors;

		let errorType: ModErrorType | undefined;
		// eslint-disable-next-line default-case
		switch (type) {
			case DependenciesTableType.REQUIRED:
				errorType = ModErrorType.MISSING_DEPENDENCIES;
				break;
			case DependenciesTableType.CONFLICT:
				errorType = ModErrorType.INCOMPATIBLE_MODS;
				break;
		}
		if (errorType) {
			return (_: unknown, record: DisplayModData) => {
				const ignoredErrors = ignoreBadValidation.get(errorType as ModErrorType);
				const myIgnoredErrors = ignoredErrors ? ignoredErrors[currentRecord.uid] || [] : [];
				const record_id = getModDataId(record);
				const isSelected =
					(type === DependenciesTableType.REQUIRED && myIgnoredErrors.includes(record_id!)) ||
					(type === DependenciesTableType.CONFLICT && myIgnoredErrors.includes(record.uid));

				const { validateCollection } = this.props;
				const saveUpdates = () => {
					updateState({});
					validateCollection();
					api.updateConfig(config as AppConfig).catch((error) => {
						api.logger.error(error);
						openNotification(
							{
								message: 'Failed to udpate config',
								placement: 'bottomLeft',
								duration: null
							},
							'error'
						);
					});
				};

				return (
					<Checkbox
						checked={isSelected}
						disabled={record.type !== ModType.DESCRIPTOR && type === DependenciesTableType.REQUIRED}
						onChange={(evt) => {
							if (type === DependenciesTableType.REQUIRED && record_id) {
								let allIgnoredErrors = ignoreBadValidation.get(errorType as ModErrorType);
								if (!allIgnoredErrors) {
									allIgnoredErrors = {};
									ignoreBadValidation.set(errorType as ModErrorType, allIgnoredErrors);
								}
								const thisIgnoredErrors = allIgnoredErrors ? allIgnoredErrors[currentRecord.uid] : [];
								if (thisIgnoredErrors) {
									if (evt.target.checked) {
										allIgnoredErrors[currentRecord.uid] = [...new Set(thisIgnoredErrors).add(record_id)];
										this.setState({}, saveUpdates);
									} else {
										allIgnoredErrors[currentRecord.uid] = thisIgnoredErrors.filter((ignoredID) => ignoredID !== record_id);
										this.setState({}, saveUpdates);
									}
								} else if (evt.target.checked) {
									allIgnoredErrors[currentRecord.uid] = [record_id];
									this.setState({}, saveUpdates);
								}
							} else if (type === DependenciesTableType.CONFLICT) {
								let allIgnoredErrors = ignoreBadValidation.get(errorType as ModErrorType);
								if (!allIgnoredErrors) {
									allIgnoredErrors = {};
									ignoreBadValidation.set(errorType as ModErrorType, allIgnoredErrors);
								}
								const thisIgnoredErrors = allIgnoredErrors ? allIgnoredErrors[currentRecord.uid] : [];
								if (thisIgnoredErrors) {
									if (evt.target.checked) {
										allIgnoredErrors[currentRecord.uid] = [...new Set(thisIgnoredErrors).add(record.uid)];
										this.setState({}, saveUpdates);
									} else {
										allIgnoredErrors[currentRecord.uid] = thisIgnoredErrors.filter((ignoredID) => ignoredID !== record.uid);
										this.setState({}, saveUpdates);
									}
								} else if (evt.target.checked) {
									allIgnoredErrors[currentRecord.uid] = [record.uid];
									this.setState({}, saveUpdates);
								}
							} else {
								console.log(record);
							}
						}}
					/>
				);
			};
		}
		return undefined;
	}

	getDependenciesRowSelection(type: DependenciesTableType, data: DisplayModData[]) {
		const { appState, enableModCallback, disableModCallback, setModSubsetCallback } = this.props;
		const { activeCollection } = appState;
		const { mods } = activeCollection!;

		// eslint-disable-next-line @typescript-eslint/ban-types
		const rowSelection: TableRowSelection<DisplayModData> = {
			selectedRowKeys: mods,
			checkStrictly: false,
			onChange: (selectedRowKeys: React.Key[]) => {
				const changes: { [uid: string]: boolean } = {};
				data.forEach((record) => {
					if (record.type === ModType.DESCRIPTOR) {
						if (record.children) {
							record.children.forEach((childData) => {
								changes[childData.uid] = selectedRowKeys.includes(childData.uid);
							});
						} else {
							changes[record.uid] = selectedRowKeys.includes(record.uid);
						}
					} else {
						changes[record.uid] = selectedRowKeys.includes(record.uid);
					}
				});
				setModSubsetCallback(changes);
			},
			onSelect: (record: DisplayModData, selected: boolean) => {
				if (record.type !== ModType.DESCRIPTOR) {
					if (selected) {
						if (!mods.includes(record.uid)) {
							mods.push(record.uid);
						}
						enableModCallback(record.uid);
					} else {
						disableModCallback(record.uid);
					}
				}
			},
			onSelectAll: (selected: boolean) => {
				api.logger.debug(`selecting full subset: ${selected}`);
				const changes: { [uid: string]: boolean } = {};
				data.forEach((record) => {
					if (record.type === ModType.DESCRIPTOR) {
						if (record.children) {
							record.children.forEach((childData) => {
								changes[childData.uid] = true;
							});
						} else {
							changes[record.uid] = true;
						}
					} else {
						changes[record.uid] = true;
					}
				});
				setModSubsetCallback(changes);
			},
			onSelectNone: () => {
				api.logger.debug(`clearing sub-selection`);
				const changes: { [uid: string]: boolean } = {};
				data.forEach((record) => {
					if (record.type === ModType.DESCRIPTOR) {
						if (record.children) {
							record.children.forEach((childData) => {
								changes[childData.uid] = false;
							});
						} else {
							changes[record.uid] = false;
						}
					} else {
						changes[record.uid] = false;
					}
				});
				setModSubsetCallback(changes);
			}
		};

		return rowSelection;
	}

	renderInfoTab() {
		const { currentRecord } = this.props;

		const descriptionLines = currentRecord.description ? currentRecord.description.split(/\r?\n/) : [];

		const steamTags = currentRecord.tags?.map((tag) => <Tag key={tag}>{tag}</Tag>) || [];
		const userTags =
			currentRecord.overrides?.tags?.map((tag) => (
				<Tag key={tag} color="blue">
					{tag}
				</Tag>
			)) || [];

		return (
			<Descriptions column={2} bordered size="small">
				<Descriptions.Item label="Author">{currentRecord.authors}</Descriptions.Item>
				<Descriptions.Item label="Tags">{steamTags.concat(userTags)}</Descriptions.Item>
				<Descriptions.Item label="Created">{formatDateStr(currentRecord.dateCreated)}</Descriptions.Item>
				<Descriptions.Item label="Installed">{formatDateStr(currentRecord.dateAdded)}</Descriptions.Item>
				<Descriptions.Item label="Description">
					<div>
						{descriptionLines.map((line, index) => (
							// eslint-disable-next-line react/no-array-index-key
							<Paragraph key={index}>{line}</Paragraph>
						))}
					</div>
				</Descriptions.Item>
			</Descriptions>
		);
	}

	renderInspectTab() {
		const { appState, currentRecord, openModal } = this.props;
		const { activeCollection, mods } = appState;

		const modDescriptor = getDescriptor(mods, currentRecord);

		return (
			<Collapse className="ModDetailInspect" defaultActiveKey={['info', 'descriptor', 'properties', 'status']}>
				<Panel header="Mod Info" key="info">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="ID">
							{!!currentRecord.id || !!currentRecord?.overrides?.id ? (
								currentRecord.id
							) : (
								<Button
									icon={<EditFilled />}
									onClick={() => {
										openModal(CollectionManagerModalType.EDIT_OVERRIDES);
									}}
								/>
							)}
						</Descriptions.Item>
						{!!currentRecord?.overrides?.id ? (
							<Descriptions.Item label="ID (Override)">
								<Button
									icon={<EditFilled />}
									onClick={() => {
										openModal(CollectionManagerModalType.EDIT_OVERRIDES);
									}}
								/>
								{currentRecord.overrides.id}
							</Descriptions.Item>
						) : null}
						<Descriptions.Item label="UID">{currentRecord.uid}</Descriptions.Item>
						<Descriptions.Item label="Name">{currentRecord.name}</Descriptions.Item>
						<Descriptions.Item label="Author">{currentRecord.authors}</Descriptions.Item>
						<Descriptions.Item label="Tags">{currentRecord.tags ? currentRecord.tags.join(', ') : null}</Descriptions.Item>
						{!!currentRecord?.overrides?.tags ? (
							<Descriptions.Item label="User Tags">{currentRecord.overrides.tags.join(', ')}</Descriptions.Item>
						) : null}
						<Descriptions.Item label="Description">{currentRecord.description}</Descriptions.Item>
					</Descriptions>
				</Panel>
				<Panel header="Mod Descriptor" key="descriptor">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="Name">{modDescriptor?.name}</Descriptions.Item>
						<Descriptions.Item label="ID">{modDescriptor?.modID}</Descriptions.Item>
						<Descriptions.Item label="Equivalent UIDs">{[...(modDescriptor?.UIDs || [])].join(', ')}</Descriptions.Item>
					</Descriptions>
				</Panel>
				<Panel header="Mod Properties" key="properties">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="BrowserLink">
							{currentRecord.workshopID ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${currentRecord.workshopID}` : null}
						</Descriptions.Item>
						<Descriptions.Item label="Requires RR">UNKNOWN</Descriptions.Item>
						<Descriptions.Item label="Has Code">{(!!currentRecord.hasCode).toString()}</Descriptions.Item>
						<Descriptions.Item label="Date Added">{formatDateStr(currentRecord.dateAdded)}</Descriptions.Item>
						<Descriptions.Item label="Date Created">{formatDateStr(currentRecord.dateCreated)}</Descriptions.Item>
						<Descriptions.Item label="Date Updated">{formatDateStr(currentRecord.lastUpdate)}</Descriptions.Item>
						<Descriptions.Item label="Image">{currentRecord.preview}</Descriptions.Item>
						<Descriptions.Item label="Path">{currentRecord.path}</Descriptions.Item>
						<Descriptions.Item label="Size">{currentRecord.size}</Descriptions.Item>
						<Descriptions.Item label="Source">{currentRecord.type}</Descriptions.Item>
						<Descriptions.Item label="SteamLink">
							{currentRecord.workshopID ? `steam://url/CommunityFilePage/${currentRecord.workshopID}` : null}
						</Descriptions.Item>
						<Descriptions.Item label="WorkshopID">
							{currentRecord.workshopID ? currentRecord.workshopID.toString() : null}
						</Descriptions.Item>
					</Descriptions>
				</Panel>
				<Panel header="Mod Status" key="status">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="Subscribed">{(!!currentRecord.subscribed).toString()}</Descriptions.Item>
						<Descriptions.Item label="Downloading">{(!!currentRecord.downloading).toString()}</Descriptions.Item>
						<Descriptions.Item label="Download Pending">{(!!currentRecord.downloadPending).toString()}</Descriptions.Item>
						<Descriptions.Item label="Needs Update">{(!!currentRecord.needsUpdate).toString()}</Descriptions.Item>
						<Descriptions.Item label="Is Installed">{(!!currentRecord.installed).toString()}</Descriptions.Item>
						<Descriptions.Item label="Is Active">
							{(!!activeCollection && activeCollection.mods.includes(currentRecord.uid)).toString()}
						</Descriptions.Item>
					</Descriptions>
				</Panel>
			</Collapse>
		);
	}

	renderDependenciesTab(requiredModData: DisplayModData[], dependentModData: DisplayModData[], conflictingModData: DisplayModData[]) {
		return (
			<ConfigProvider
				renderEmpty={() => {
					return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 5, marginBottom: 5 }} />;
				}}
			>
				<Collapse className="ModDetailDependencies" defaultActiveKey={['info', 'properties', 'status']}>
					<Panel header="Required mods:" key="info">
						<Table
							pagination={false}
							size="small"
							rowKey="uid"
							sticky
							dataSource={requiredModData}
							rowSelection={this.getDependenciesRowSelection(DependenciesTableType.REQUIRED, requiredModData)}
							columns={this.getDependenciesSchema(DependenciesTableType.REQUIRED)}
						/>
					</Panel>
					<Panel header="Dependent mods:" key="properties">
						<Table
							pagination={false}
							size="small"
							rowKey="uid"
							sticky
							dataSource={dependentModData}
							rowSelection={this.getDependenciesRowSelection(DependenciesTableType.DEPENDENT, dependentModData)}
							columns={this.getDependenciesSchema(DependenciesTableType.DEPENDENT)}
						/>
					</Panel>
					<Panel header="Conflicting mods:" key="status">
						<Table
							pagination={false}
							size="small"
							rowKey="uid"
							sticky
							dataSource={conflictingModData}
							rowSelection={this.getDependenciesRowSelection(DependenciesTableType.CONFLICT, conflictingModData)}
							columns={this.getDependenciesSchema(DependenciesTableType.CONFLICT)}
						/>
					</Panel>
				</Collapse>
			</ConfigProvider>
		);
	}

	render() {
		const { appState, bigDetails, currentRecord, closeFooterCallback, expandFooterCallback } = this.props;
		const normalStyle = { minHeight: '25%', maxHeight: '50%' };
		const bigStyle = {};

		const { mods } = appState;
		const modDescriptor = getDescriptor(mods, currentRecord);
		const dependentModDescriptors = currentRecord.isDependencyFor || [];
		const requiredModDescriptors = currentRecord.dependsOn || [];

		const requiredModData: DisplayModData[] = requiredModDescriptors.map((descriptor) => {
			const uids = descriptor.UIDs;
			if (uids.size <= 1) {
				const uid = [...uids][0];
				const modData = mods.modIdToModDataMap.get(uid);
				if (modData) {
					return { ...modData, type: ModType.DESCRIPTOR };
				}
				return { uid, id: 'INVALID', type: ModType.INVALID };
			}
			return {
				uid: `${ModType.DESCRIPTOR}:${descriptor.modID}`,
				id: descriptor.modID || null,
				type: ModType.DESCRIPTOR,
				name: descriptor.modID,
				children: [...uids].map((uid) => mods.modIdToModDataMap.get(uid) || { uid, id: 'INVALID', type: ModType.INVALID })
			};
		});
		const dependentModData: DisplayModData[] = dependentModDescriptors.map((descriptor) => {
			const uids = descriptor.UIDs;
			if (uids.size <= 1) {
				const uid = [...uids][0];
				return mods.modIdToModDataMap.get(uid) || { uid, id: 'INVALID', type: ModType.INVALID };
			}
			return {
				uid: `${ModType.DESCRIPTOR}:${descriptor.modID}`,
				id: descriptor.modID || null,
				type: ModType.DESCRIPTOR,
				name: `${descriptor.modID} Mod Group`,
				children: [...uids].map((uid) => mods.modIdToModDataMap.get(uid) || { uid, id: 'INVALID', type: ModType.INVALID })
			};
		});
		const conflictingModData: DisplayModData[] = [...(modDescriptor?.UIDs || [])]
			.filter((uid) => uid !== currentRecord.uid)
			.map((uid) => mods.modIdToModDataMap.get(uid) || { uid, id: 'INVALID', type: ModType.INVALID });

		const showDependenciesTab = requiredModData.length > 0 || dependentModData.length > 0 || conflictingModData.length > 0;

		const currentRecord_id = getModDataId(currentRecord);
		return (
			<Content className="ModDetailFooter" style={bigDetails ? bigStyle : normalStyle}>
				<PageHeader
					title={currentRecord.name}
					subTitle={`${currentRecord_id} (${currentRecord.uid})`}
					style={{ width: '100%', height: 48 }}
					extra={
						<Space>
							<Button
								icon={bigDetails ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
								type="text"
								onClick={() => {
									expandFooterCallback(!bigDetails);
								}}
							/>
							<Button icon={<CloseOutlined />} type="text" onClick={closeFooterCallback} />
						</Space>
					}
				/>
				<Row key="mod-details" justify="space-between" gutter={16} style={{ height: 'calc(100% - 48px)' }}>
					<Col span={2} lg={4} style={{ paddingLeft: 10 }}>
						{getImagePreview(currentRecord.preview)}
					</Col>
					<Col span={22} lg={20} style={{ height: '100%' }}>
						<Content style={{ overflowY: 'auto', paddingBottom: 10, paddingRight: 10, height: '100%' }}>
							<Tabs defaultActiveKey="info">
								<TabPane tab="Info" key="info">
									{this.renderInfoTab()}
								</TabPane>
								<TabPane tab="Inspect" key="inspect">
									{this.renderInspectTab()}
								</TabPane>
								<TabPane tab="Dependencies" key="dependencies" disabled={!showDependenciesTab}>
									{this.renderDependenciesTab(requiredModData, dependentModData, conflictingModData)}
								</TabPane>
							</Tabs>
						</Content>
					</Col>
				</Row>
			</Content>
		);
	}
}
