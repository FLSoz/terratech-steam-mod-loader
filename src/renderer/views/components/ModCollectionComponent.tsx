/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout, Table, Tag, Space, Button, Modal, Tooltip } from 'antd';
import React, { Component, ReactNode } from 'react';
import { DeploymentUnitOutlined, FileImageOutlined, ShareAltOutlined, CodeOutlined, ZoomInOutlined, CloseOutlined } from '@ant-design/icons';
import parse from 'html-react-parser';

import { ColumnType } from 'antd/lib/table';

import { Mod, ModType } from 'renderer/model/Mod';
import { ModCollection } from 'renderer/model/ModCollection';
import local from '../../../../assets/local.png';
import steam from '../../../../assets/steam.png';
import ttmm from '../../../../assets/ttmm.png';

const { Content } = Layout;

interface ModCollectionProps {
	collection: ModCollection;
	mods: Map<string, Mod>;
	height: number;
	width: number;
	forceUpdate: boolean;
	children?: ReactNode;
	setEnabledModsCallback: (mods: Set<string>) => any;
	setDisabledModsCallback: (mods: Set<string>) => any;
	setAllEnabledCallback: () => any;
	clearAllEnabledCallback: () => any;
	setEnabledCallback: (mod: string) => any;
	setDisabledCallback: (mod: string) => any;
}

interface ModData {
	key: string;
	id: string;
	type: ModType;
	preview?: string;
	name: string;
	description?: string;
	author?: string;
	dependsOn?: string[];
	hasCode?: boolean;
	isDependencyFor?: string[];
	tags?: string[];
}

interface ModCollectionState {
	search?: string;
	rows: ModData[];
	currentHeight: number;
	selectedModKeys: React.Key[];
	renderPreviewModal?: string;
	failAddModal?: string;
	failRemoveModal?: string;
	missingModsModal?: string[];
}

function convertToModData(input: Map<string, Mod>): ModData[] {
	const dependenciesMap: Map<string, Set<string>> = new Map();
	const tempMap: Map<string, ModData> = new Map();
	const workshopMap: Map<string, string> = new Map();
	[...input.values()].forEach((mod: Mod) => {
		const modData = {
			key: mod.ID,
			id: mod.WorkshopID ? `${mod.WorkshopID}` : mod.ID,
			type: mod.type,
			preview: mod.config?.preview,
			name: mod.config && mod.config.name ? mod.config.name : mod.ID,
			description: mod.config?.description,
			author: mod.config?.author,
			dependsOn: mod.config?.dependsOn,
			hasCode: mod.config?.hasCode,
			tags: mod.config?.tags
		};
		tempMap.set(mod.ID, modData);
		if (mod.WorkshopID) {
			workshopMap.set(mod.WorkshopID.toString(), mod.ID);
		}
		if (modData.dependsOn) {
			modData.dependsOn.forEach((dependency) => {
				if (dependenciesMap.has(dependency)) {
					const reliers = dependenciesMap.get(dependency);
					reliers?.add(mod.ID);
				} else {
					dependenciesMap.set(dependency, new Set(mod.ID));
				}
			});
		}
	});
	const missingMods = [];
	dependenciesMap.forEach((reliers, dependency) => {
		const modData = tempMap.get(dependency);
		if (modData) {
			modData.isDependencyFor = [...reliers];
		} else {
			missingMods.push(dependency);
		}
	});
	return [...tempMap.values()];
}

function getImageSrcFromType(type: ModType) {
	switch (type) {
		case ModType.LOCAL:
			return (
				<Tooltip title="This is a local mod">
					<img src={local} width="25px" alt="" key="type" />
				</Tooltip>
			);
		case ModType.TTQMM:
			return (
				<Tooltip title="This is a TTMM mod">
					<img src={ttmm} width="25px" alt="" key="type" />
				</Tooltip>
			);
		case ModType.WORKSHOP:
			return (
				<Tooltip title="This is a Steam mod">
					<img src={steam} width="25px" alt="" key="type" />
				</Tooltip>
			);
		default:
			return (
				<Tooltip title="This is a local mod">
					<img src={local} width="25px" alt="" key="type" />
				</Tooltip>
			);
	}
}

export default class ModCollectionComponent extends Component<ModCollectionProps, ModCollectionState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: ModCollectionProps) {
		super(props);
		const { mods } = this.props;
		const rows: ModData[] = mods ? convertToModData(mods) : [];
		console.log(mods);
		this.state = {
			rows,
			currentHeight: 400,
			selectedModKeys: []
		};
	}

	shouldComponentUpdate(nextProps: ModCollectionProps) {
		return true;
		// return nextProps.forceUpdate;
	}

	handleClick(event: any, id: string) {
		const { setEnabledCallback, setDisabledCallback } = this.props;
		if (event.target.checked) {
			setEnabledCallback(id);
		} else {
			setDisabledCallback(id);
		}
		this.setState({});
	}

	handleSelectAllClick(event: any) {
		const { setAllEnabledCallback, clearAllEnabledCallback } = this.props;
		if (event.target.checked) {
			setAllEnabledCallback();
		} else {
			clearAllEnabledCallback();
		}
		this.setState({});
	}

	disableMod(id: string) {}

	enableMod(id: string) {}

	enableDropdown(id: string) {}

	renderHeader() {}

	renderPreviewModal(path: string) {
		this.setState({
			renderPreviewModal: path
		});
	}

	renderModals() {
		const { renderPreviewModal } = this.state;
		if (renderPreviewModal) {
			return (
				<Modal
					title="Preview"
					visible
					footer={null}
					closeIcon={
						<Button
							shape="circle"
							icon={<CloseOutlined color="white" />}
							type="dashed"
							onClick={() => {
								this.setState({ renderPreviewModal: undefined });
							}}
						/>
					}
					style={{
						display: 'flex',
						maxWidth: '100%'
					}}
					width="100%"
				>
					<img src={renderPreviewModal} key="full-preview" alt="" />
				</Modal>
			);
		}
		return null;
	}

	render() {
		const { rows } = this.state;
		// <img src={cellData} height="50px" width="50px" />
		// <div>
		/*
		{cellData === ModType.WORKSHOP
			? steam
			: cellData === ModType.TTQMM
			? ttmm
			: local}
			*/
		const { selectedModKeys } = this.state;

		const rowSelection = {
			selectedRowKeys: selectedModKeys,
			// eslint-disable-next-line @typescript-eslint/ban-types
			onChange: (selectedRowKeys: React.Key[], selectedRows: object[]) => {
				console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
				this.props.setEnabledModsCallback(
					new Set(
						(selectedRows as ModData[]).map((mod: ModData) => {
							return mod.id;
						})
					)
				);
				this.setState({
					selectedModKeys: selectedRowKeys
				});
			}
		};

		const expandable = {
			// eslint-disable-next-line @typescript-eslint/ban-types
			expandedRowRender: (record: object) => parse((record as ModData).description as string),
			// eslint-disable-next-line @typescript-eslint/ban-types
			rowExpandable: (record: object) => {
				const { description } = record as ModData;
				return !!description && description.length > 0;
			}
		};

		// eslint-disable-next-line @typescript-eslint/ban-types
		const columns: ColumnType<object>[] = [
			{
				title: 'Type',
				dataIndex: 'type',
				render: (type: ModType) => getImageSrcFromType(type),
				width: 65,
				align: 'center'
			},
			{
				title: 'Preview',
				dataIndex: 'preview',
				render: (imgPath: string | undefined | null) => {
					if (imgPath) {
						return (
							<Tooltip title="Click for full size image">
								<div className="container">
									<img src={imgPath} width="60px" alt="" key="preview" className="image" />
									<div className="image-hover">
										<Button
											shape="circle"
											icon={<ZoomInOutlined color="white" />}
											type="dashed"
											onClick={() => {
												this.renderPreviewModal(imgPath);
											}}
										/>
									</div>
								</div>
							</Tooltip>
						);
					}
					return <FileImageOutlined style={{ fontSize: '40px', color: '#08c' }} />;
				},
				width: 85,
				align: 'center'
			},
			{
				key: 'dependency',
				// eslint-disable-next-line @typescript-eslint/ban-types
				render: (_: unknown, record: object) => {
					const modData = record as ModData;
					const isDependency = !!modData.isDependencyFor;
					const hasDependencies = !!modData.dependsOn;
					const hasCode = !!modData.hasCode;
					return (
						<Space>
							{isDependency ? (
								<Tooltip title="This mod is a dependency for another mod">
									<ShareAltOutlined />
								</Tooltip>
							) : (
								<> </>
							)}
							{hasDependencies ? (
								<Tooltip title="This depends on another mod">
									<DeploymentUnitOutlined />
								</Tooltip>
							) : (
								<> </>
							)}
							{hasCode ? (
								<Tooltip title="This mod has code">
									<CodeOutlined />
								</Tooltip>
							) : (
								<> </>
							)}
						</Space>
					);
				},
				width: 75
			},
			{
				title: 'Name',
				dataIndex: 'name',
				width: 300,
				defaultSortOrder: 'ascend',
				sorter: (a, b) => ((a as ModData).name > (b as ModData).name ? 1 : -1)
			},
			{
				title: 'Tags',
				dataIndex: 'tags',
				// eslint-disable-next-line @typescript-eslint/ban-types
				render: (tags: string[] | undefined, record: object) => {
					return [...(tags || []), (record as ModData).type].map((tag) => {
						return (
							<Tag color="blue" key={tag}>
								{tag}
							</Tag>
						);
					});
				}
			},
			{
				title: 'Author',
				dataIndex: 'author',
				width: 150,
				defaultSortOrder: 'ascend',
				sorter: (a, b) => {
					const v1 = a as ModData;
					const v2 = b as ModData;
					if (v1.author) {
						if (v2.author) {
							return v1.author > v2.author ? 1 : -1;
						}
						return 1;
					}
					return -1;
				}
			}
		];

		return (
			// eslint-disable-next-line react/destructuring-assignment
			<Layout style={{ width: this.props.width, height: this.props.height }}>
				{this.renderModals()}
				<Content key="main table" style={{ padding: '0px', overflowY: 'scroll' }}>
					<Table dataSource={rows} pagination={false} rowSelection={rowSelection} expandable={expandable} columns={columns} sticky tableLayout="fixed" />
				</Content>
			</Layout>
		);
	}
}
