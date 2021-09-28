import { Layout, Row, Col, Table, Tag, Space } from 'antd';
import React, { Component, ReactNode, Ref } from 'react';
import { Mod, ModType } from 'renderer/model/Mod';
import { ModCollection } from 'renderer/model/ModCollection';
import {
	DeploymentUnitOutlined,
	FileImageOutlined,
	ShareAltOutlined
} from '@ant-design/icons';
import { SizeMe } from 'react-sizeme';

import { ColumnType } from 'antd/lib/table';
import local from '../../../../assets/local.png';
import steam from '../../../../assets/steam.png';
import ttmm from '../../../../assets/ttmm.png';

const { Header, Footer, Sider, Content } = Layout;

interface ModCollectionProps {
	collection: ModCollection;
	mods: Map<string, Mod>;
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
	id: string;
	type: ModType;
	preview?: string;
	name: string;
	description?: string;
	author?: string;
	dependsOn?: string[];
	isDependencyFor?: string[];
	tags?: string[];
}

interface ModCollectionState {
	search?: string;
	rows: ModData[];
	currentHeight: number;
}

function convertToModData(input: Map<string, Mod>): ModData[] {
	const dependenciesMap: Map<string, Set<string>> = new Map();
	const tempMap: Map<string, ModData> = new Map();
	[...input.values()].forEach((mod: Mod) => {
		const modData = {
			id: mod.ID,
			type: mod.type,
			preview: mod.config?.preview,
			name: mod.config && mod.config.name ? mod.config.name : mod.ID,
			description: mod.config?.description,
			author: mod.config?.author,
			dependsOn: mod.config?.dependsOn
		};
		tempMap.set(mod.ID, modData);
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
	dependenciesMap.forEach((reliers, dependency) => {
		const modData = tempMap.get(dependency);
		modData!.isDependencyFor = [...reliers];
	});
	return [...tempMap.values()];
}

function getImageSrcFromType(type: ModType) {
	switch (type) {
		case ModType.LOCAL:
			return local;
		case ModType.TTQMM:
			return ttmm;
		case ModType.WORKSHOP:
			return steam;
		default:
			return local;
	}
}

// eslint-disable-next-line @typescript-eslint/ban-types
const columns: ColumnType<object>[] = [
	{
		key: 'preview',
		dataIndex: 'preview',
		render: (imgPath: string | undefined | null) => {
			if (imgPath) {
				return <img src={imgPath} height="50px" width="50px" alt="" />;
			}
			return <FileImageOutlined style={{ fontSize: '40px', color: '#08c' }} />;
		},
		width: 50
	},
	{
		key: 'dependency',
		// eslint-disable-next-line @typescript-eslint/ban-types
		render: (_: unknown, record: object) => {
			const modData = record as ModData;
			const isDependency = !!modData.isDependencyFor;
			const hasDependencies = !!modData.dependsOn;
			return (
				<Space>
					{isDependency ? <ShareAltOutlined /> : <> </>}
					{hasDependencies ? <DeploymentUnitOutlined /> : <> </>}
				</Space>
			);
		},
		width: 35
	},
	{
		key: 'type',
		dataIndex: 'type',
		render: (type: ModType) => (
			<img src={getImageSrcFromType(type)} width="25px" alt="" />
		),
		width: 25
	},
	{ title: 'Name', key: 'name', dataIndex: 'name', width: 150 },
	{
		title: 'Tags',
		dataIndex: 'tags',
		key: 'tags',
		render: (tags: string[] | undefined) => {
			if (tags) {
				return tags.map((tag) => {
					return (
						<Tag color="blue" key={tag}>
							{tag}
						</Tag>
					);
				});
			}
			return <> </>;
		},
		width: 200
	},
	{ title: 'Author', key: 'author', dataIndex: 'author', width: 150 },
	{
		title: 'Description',
		key: 'description',
		dataIndex: 'description'
	}
];

export default class ModCollectionComponent extends Component<
	ModCollectionProps,
	ModCollectionState
> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: ModCollectionProps) {
		super(props);
		const { mods } = this.props;
		const rows: ModData[] = mods ? convertToModData(mods) : [];
		this.state = {
			rows,
			currentHeight: 400
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

	render() {
		const { rows } = this.state;
		console.log(rows);
		// <img src={cellData} height="50px" width="50px" />
		// <div>
		/*
		{cellData === ModType.WORKSHOP
			? steam
			: cellData === ModType.TTQMM
			? ttmm
			: local}
			*/

		const rowSelection = {
			// eslint-disable-next-line @typescript-eslint/ban-types
			onChange: (selectedRowKeys: React.Key[], selectedRows: object[]) => {
				console.log(
					`selectedRowKeys: ${selectedRowKeys}`,
					'selectedRows: ',
					selectedRows
				);
			},
			// eslint-disable-next-line @typescript-eslint/ban-types
			getCheckboxProps: (record: object) => {
				const modData = record as ModData;
				return {
					disabled: modData.name === 'Disabled User', // Column configuration not to be checked
					name: modData.name
				};
			},
			fixed: true
		};

		return (
			<Layout>
				<Header>
					<Row key="row1">
						<Col span={16} key="left">
							Part 1
						</Col>
						<Col span={8} key="right">
							Part 2
						</Col>
					</Row>
					<Row key="row2">
						<Col span={16} key="left">
							Part 3
						</Col>
						<Col span={8} key="right">
							Part 4
						</Col>
					</Row>
				</Header>
				<Content>
					<SizeMe monitorHeight>
						{({ size }) => {
							console.log('SIZE');
							console.log(size);
							const height = size.height ? size.height : 400;
							return (
								<div style={{ position: 'relative', height: '100%' }}>
									<div
										style={{
											position: 'absolute',
											width: '100%',
											height
										}}
									>
										<Table
											dataSource={rows}
											scroll={{
												scrollToFirstRowOnChange: true,
												x: 'max-content',
												y: height
											}}
											pagination={false}
											rowSelection={rowSelection}
											columns={columns}
										/>
									</div>
								</div>
							);
						}}
					</SizeMe>
				</Content>
				<Footer>FOOTER</Footer>
			</Layout>
		);
	}
}
