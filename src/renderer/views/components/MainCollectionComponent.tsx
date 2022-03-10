/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout, Table, Tag, Space, Tooltip, Image } from 'antd';
import { useOutletContext } from 'react-router-dom';
import React, { Component } from 'react';
import {
	DeploymentUnitOutlined,
	FileImageOutlined,
	ShareAltOutlined,
	CodeOutlined,
} from '@ant-design/icons';
import parse from 'html-react-parser';

import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import { api } from 'renderer/model/Api';
import { ModData, ModType } from 'renderer/model/Mod';
import { ModCollectionProps } from 'renderer/model/ModCollection';
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

class MainCollectionComponent extends Component<ModCollectionProps, never> {
	componentDidMount() {
		this.setState({});
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
		const { setEnabledModsCallback, setEnabledCallback, setDisabledCallback } =
			this.props;

		// eslint-disable-next-line @typescript-eslint/ban-types
		const rowSelection: TableRowSelection<ModData> = {
			selections: [Table.SELECTION_INVERT],
			selectedRowKeys: collection.mods,
			onChange: (selectedRowKeys: React.Key[]) => {
				const currentVisible = new Set(
					filteredRows.map((modData) => modData.uid)
				);
				const currentSelection = collection.mods;
				const newSelection = rows
					.map((modData) => modData.uid)
					.filter((mod) => {
						return (
							(!currentVisible.has(mod) && currentSelection.includes(mod)) ||
							selectedRowKeys.includes(mod)
						);
					});
				setEnabledModsCallback(new Set(newSelection));
			},
			onSelect: (record: ModData, selected: boolean) => {
				api.logger.info(`selecting ${record.uid}: ${selected}`);
				if (selected) {
					if (!collection.mods.includes(record.uid)) {
						collection.mods.push(record.uid);
					}
					setEnabledCallback(record.uid);
				} else {
					setDisabledCallback(record.uid);
				}
			},
			onSelectAll: (selected: boolean) => {
				api.logger.info(`selecting all: ${selected}`);
				const currentVisible = filteredRows.map((modData) => modData.uid);
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
				const currentVisible = filteredRows.map((modData) => modData.uid);
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
				const currentVisible = filteredRows.map((modData) => modData.uid);
				const selected = new Set(collection.mods);
				currentVisible.forEach((mod) => {
					selected.delete(mod);
				});
				setEnabledModsCallback(selected);
			},
		};

		const expandable = {
			// eslint-disable-next-line @typescript-eslint/ban-types
			expandedRowRender: (record: ModData) =>
				parse(record.description as string),
			// eslint-disable-next-line @typescript-eslint/ban-types
			rowExpandable: (record: ModData) => {
				const { description } = record;
				return !!description && description.length > 0;
			},
		};

		// eslint-disable-next-line @typescript-eslint/ban-types
		const columns: ColumnType<ModData>[] = [
			{
				title: 'Type',
				dataIndex: 'type',
				render: (type: ModType) => getImageSrcFromType(type),
				width: 65,
				align: 'center',
			},
			{
				title: 'Preview',
				dataIndex: 'preview',
				render: (imgPath: string | undefined | null) => {
					if (imgPath) {
						return <Image width={60} src={imgPath} key="preview" />;
					}
					return (
						<FileImageOutlined style={{ fontSize: '40px', color: '#08c' }} />
					);
				},
				width: 85,
				align: 'center',
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
				width: 75,
			},
			{
				title: 'Name',
				dataIndex: 'name',
				defaultSortOrder: 'ascend',
				sorter: (a, b) => (a.name > b.name ? 1 : -1),
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
				},
			},
			{
				title: 'Authors',
				dataIndex: 'authors',
				width: 150,
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
						return (
							<Tag color="green" key={author}>
								{author}
							</Tag>
						);
					});
				},
			},
		];

		return (
			// eslint-disable-next-line react/destructuring-assignment
			<Layout style={{ width: this.props.width, height: this.props.height }}>
				<Content
					key="main table"
					style={{ padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' }}
				>
					<Table
						dataSource={filteredRows}
						pagination={false}
						rowKey="uid"
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

export default () => {
	return <MainCollectionComponent {...useOutletContext()} />;
};
