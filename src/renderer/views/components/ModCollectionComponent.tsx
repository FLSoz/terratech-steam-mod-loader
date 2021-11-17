/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout, Table, Tag, Space, Button, Modal, Tooltip } from 'antd';
import React, { Component, ReactNode } from 'react';
import { DeploymentUnitOutlined, FileImageOutlined, ShareAltOutlined, CodeOutlined, ZoomInOutlined, CloseOutlined } from '@ant-design/icons';
import parse from 'html-react-parser';

import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import { api } from 'renderer/model/Api';
import { Mod, ModData, ModType } from 'renderer/model/Mod';
import { ModCollection } from 'renderer/model/ModCollection';
import local from '../../../../assets/local.png';
import steam from '../../../../assets/steam.png';
import ttmm from '../../../../assets/ttmm.png';

const { Content } = Layout;

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

interface ModCollectionProps {
	rows: ModData[];
	filteredRows: ModData[];
	collection: ModCollection;
	mods: Map<string, Mod>;
	height: number;
	width: number;
	children?: ReactNode;
	setEnabledModsCallback: (mods: Set<string>) => any;
	setEnabledCallback: (mod: string) => any;
	setDisabledCallback: (mod: string) => any;
}

interface ModCollectionState {
	renderPreviewModal?: string;
	failAddModal?: string;
	failRemoveModal?: string;
	missingModsModal?: string[];
}

export default class ModCollectionComponent extends Component<ModCollectionProps, ModCollectionState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: ModCollectionProps) {
		super(props);
		const { mods } = this.props;
		api.logger.info(mods);
		this.state = {};
	}

	componentDidMount() {
		this.setState({});
	}

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
		const { collection, rows, filteredRows } = this.props;
		// <img src={cellData} height="50px" width="50px" />
		// <div>
		/*
		{cellData === ModType.WORKSHOP
			? steam
			: cellData === ModType.TTQMM
			? ttmm
			: local}
			*/
		const { setEnabledModsCallback, setEnabledCallback, setDisabledCallback } = this.props;

		// eslint-disable-next-line @typescript-eslint/ban-types
		const rowSelection: TableRowSelection<ModData> = {
			selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
			selectedRowKeys: collection.mods,
			onChange: (selectedRowKeys: React.Key[]) => {
				api.logger.info(`changing selecton: ${selectedRowKeys}`);
				const currentVisible = new Set(filteredRows.map((modData) => modData.id));
				const newSelection = rows
					.map((modData) => modData.id)
					.filter((mod) => {
						return !currentVisible.has(mod) || selectedRowKeys.includes(mod);
					});
				setEnabledModsCallback(new Set(newSelection));
			},
			onSelect: (record: ModData, selected: boolean) => {
				api.logger.info(`selecting ${record.id}: ${selected}`);
				if (selected) {
					if (!collection.mods.includes(record.id)) {
						collection.mods.push(record.id);
					}
					setEnabledCallback(record.id);
				} else {
					setDisabledCallback(record.id);
				}
			},
			onSelectAll: (selected: boolean) => {
				api.logger.info(`selecting all: ${selected}`);
				const currentVisible = filteredRows.map((modData) => modData.id);
				const selectedMods = new Set(collection.mods);
				currentVisible.forEach((mod) => {
					if (selected) {
						selectedMods.add(mod);
					} else {
						selectedMods.delete(mod);
					}
				});
				setEnabledModsCallback(selectedMods);
			},
			onSelectInvert: () => {
				api.logger.info(`inverting selection`);
				const currentVisible = filteredRows.map((modData) => modData.id);
				const selected = new Set(collection.mods);
				currentVisible.forEach((mod) => {
					if (!selected.has(mod)) {
						selected.add(mod);
					} else {
						selected.delete(mod);
					}
				});
				setEnabledModsCallback(selected);
			},
			onSelectNone: () => {
				api.logger.info(`clearing selection`);
				const currentVisible = filteredRows.map((modData) => modData.id);
				const selected = new Set(collection.mods);
				currentVisible.forEach((mod) => {
					selected.delete(mod);
				});
				setEnabledModsCallback(selected);
			}
		};

		const expandable = {
			// eslint-disable-next-line @typescript-eslint/ban-types
			expandedRowRender: (record: ModData) => parse(record.description as string),
			// eslint-disable-next-line @typescript-eslint/ban-types
			rowExpandable: (record: ModData) => {
				const { description } = record;
				return !!description && description.length > 0;
			}
		};

		// eslint-disable-next-line @typescript-eslint/ban-types
		const columns: ColumnType<ModData>[] = [
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
				render: (_: unknown, record: ModData) => {
					const modData = record;
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
				sorter: (a, b) => (a.name > b.name ? 1 : -1)
			},
			{
				title: 'Tags',
				dataIndex: 'tags',
				// eslint-disable-next-line @typescript-eslint/ban-types
				render: (tags: string[] | undefined, record: ModData) => {
					return [...(tags || []), record.type].map((tag) => {
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
					const v1 = a;
					const v2 = b;
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
				<Content key="main table" style={{ padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' }}>
					<Table
						dataSource={filteredRows}
						pagination={false}
						rowKey="id"
						rowSelection={rowSelection}
						expandable={expandable}
						columns={columns}
						sticky
						tableLayout="fixed"
					/>
				</Content>
			</Layout>
		);
	}
}
