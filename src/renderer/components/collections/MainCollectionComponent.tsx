/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, Layout, Table, Tag, Tooltip, Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';
import React, { Component } from 'react';
import { ColumnType } from 'antd/lib/table';
import { CompareFn, TableRowSelection } from 'antd/lib/table/interface';
import api from 'renderer/Api';
import { CollectionViewProps, DisplayModData, MainCollectionConfig, MainColumnTitles, ModErrors, ModType, ValidChannel } from 'model';
import { WarningTwoTone, ClockCircleTwoTone, StopTwoTone, HddFilled, PlusOutlined } from '@ant-design/icons';
import { formatDateStr } from 'util/Date';

import steam from '../../../../assets/steam.png';
import ttmm from '../../../../assets/ttmm.png';
import Corp_Icon_HE from '../../../../assets/Corp_Icon_HE.png';
import Corp_Icon_BF from '../../../../assets/Corp_Icon_BF.png';
import Corp_Icon_GC from '../../../../assets/Corp_Icon_GC.png';
import Corp_Icon_GSO from '../../../../assets/Corp_Icon_GSO.png';
import Corp_Icon_VEN from '../../../../assets/Corp_Icon_VEN.png';
import Corp_Icon_RR from '../../../../assets/Corp_Icon_EXP.png';
import Corp_Icon_SPE from '../../../../assets/Corp_Icon_SPE.png';

const { Content } = Layout;

interface MainCollectionState {
	currentRecord?: DisplayModData;
	bigDetails?: boolean;
}

function getImageSrcFromType(type: ModType, size = 15) {
	switch (type) {
		case ModType.LOCAL:
			return (
				<Tooltip title="This is a local mod">
					<HddFilled style={{ fontSize: size }} />
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

enum CorpType {
	HE = 'he',
	GSO = 'gso',
	GC = 'gc',
	BF = 'bf',
	VEN = 'ven',
	RR = 'rr',
	SPE = 'spe'
}

function getCorpIcon(type: CorpType, size = 15) {
	switch (type) {
		case CorpType.HE:
			return (
				<Tooltip title="Hawkeye" key={type}>
					<img src={Corp_Icon_HE} width={size} alt="" key={type} />
				</Tooltip>
			);
		case CorpType.GSO:
			return (
				<Tooltip title="Galactic Survey Organization" key={type}>
					<img src={Corp_Icon_GSO} width={size} alt="" key={type} />
				</Tooltip>
			);
		case CorpType.GC:
			return (
				<Tooltip title="GeoCorp" key={type}>
					<img src={Corp_Icon_GC} width={size} alt="" key={type} />
				</Tooltip>
			);
		case CorpType.BF:
			return (
				<Tooltip title="Better Future" key={type}>
					<img src={Corp_Icon_BF} width={size} alt="" key={type} />
				</Tooltip>
			);
		case CorpType.RR:
			return (
				<Tooltip title="Reticule Research" key={type}>
					<img src={Corp_Icon_RR} width={size} alt="" key={type} />
				</Tooltip>
			);
		case CorpType.SPE:
			return (
				<Tooltip title="Special" key={type}>
					<img src={Corp_Icon_SPE} width={size} alt="" key={type} />
				</Tooltip>
			);
		case CorpType.VEN:
			return (
				<Tooltip title="Venture" key={type}>
					<img src={Corp_Icon_VEN} width={size} alt="" key={type} />
				</Tooltip>
			);
		default:
			return null;
	}
}
function getCorpType(tag: string): CorpType | null {
	const lowercase = tag.toLowerCase();
	if (lowercase === 'gso') {
		return CorpType.GSO;
	}
	if (lowercase === 'he' || lowercase === 'hawkeye') {
		return CorpType.HE;
	}
	if (lowercase === 'gc' || lowercase === 'geocorp') {
		return CorpType.GC;
	}
	if (lowercase === 'ven' || lowercase === 'venture') {
		return CorpType.VEN;
	}
	if (lowercase === 'bf' || lowercase === 'betterfuture') {
		return CorpType.BF;
	}
	if (lowercase === 'rr' || lowercase === 'reticuleresearch') {
		return CorpType.RR;
	}
	if (lowercase === 'spe' || lowercase === 'special') {
		return CorpType.SPE;
	}
	return null;
}

interface ColumnSchema<T> {
	title: string;
	dataIndex: string;
	className?: string;
	width?: number;
	align?: 'center';
	defaultSortOrder?: 'ascend';
	sorter?:
		| boolean
		| CompareFn<DisplayModData>
		| {
				compare?: CompareFn<DisplayModData> | undefined;
				multiple?: number | undefined;
		  }
		| undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	renderSetup?: (props: CollectionViewProps) => (value: any, record: T, index: number) => React.ReactNode;
}

const { Text } = Typography;

const MAIN_COLUMN_SCHEMA: ColumnSchema<DisplayModData>[] = [
	{
		title: MainColumnTitles.TYPE,
		dataIndex: 'type',
		className: 'CollectionRowModType',
		renderSetup: (props: CollectionViewProps) => {
			const { config } = props;
			const small = (config as MainCollectionConfig | undefined)?.smallRows;
			return (type: ModType, record: DisplayModData) => (
				<Button
					type="text"
					onClick={() => {
						// eslint-disable-next-line react/prop-types
					}}
				>
					{getImageSrcFromType(type, small ? 20 : 35)}
				</Button>
			);
		},
		width: 65,
		align: 'center'
	},
	{
		title: MainColumnTitles.NAME,
		dataIndex: 'name',
		className: 'CollectionRowModName',
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
		renderSetup: (props: CollectionViewProps) => {
			return (name: string, record: DisplayModData) => {
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
					<button
						type="submit"
						style={{
							fontSize: 14,
							backgroundColor: 'transparent',
							borderRadius: 0,
							width: '100%',
							padding: 2,
							paddingLeft: 6,
							paddingRight: 4,
							margin: 0,
							verticalAlign: 'middle',
							textAlign: 'left',
							wordWrap: 'break-word',
							display: 'block'
						}}
						onClick={() => {
							// eslint-disable-next-line react/prop-types
							const { getModDetails } = props;
							getModDetails(record.uid, record);
						}}
					>
						{updateIcon}
						<Text
							strong={record.needsUpdate}
							type={updateType}
							style={{ whiteSpace: 'normal', width: '100%', verticalAlign: 'middle' }}
						>{` ${name}`}</Text>
					</button>
				);
			};
		}
	},
	{
		title: MainColumnTitles.AUTHORS,
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
		renderSetup: () => {
			return (authors: string[] | undefined) => {
				return (authors || []).map((author) => {
					return <Tag key={author}>{author}</Tag>;
				});
			};
		}
	},
	{
		title: MainColumnTitles.STATE,
		dataIndex: 'errors',
		renderSetup: (props: CollectionViewProps) => {
			const { lastValidationStatus, collection } = props;
			return (errors: ModErrors | undefined, record: DisplayModData) => {
				const selectedMods = collection.mods;
				const { uid, subscribed, workshopID, installed, id } = record;
				if (installed && id === null) {
					return (
						<Tag key="notValid" color="red">
							Invalid
						</Tag>
					);
				}
				if (!selectedMods.includes(uid)) {
					if (!subscribed && workshopID && workshopID > 0) {
						return <Tag key="notSubscribed">Not subscribed</Tag>;
					}
					if (subscribed && !installed) {
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
				if (lastValidationStatus !== undefined) {
					return (
						<Tag key="OK" color="green">
							OK
						</Tag>
					);
				}
				return null;
			};
		}
	},
	{
		title: MainColumnTitles.ID,
		dataIndex: 'id',
		sorter: (a, b) => {
			if (a.id) {
				if (b.id) {
					return a.id > b.id ? 1 : -1;
				}
				return 1;
			}
			if (b.id) {
				return -1;
			}
			return 0;
		}
	},
	{
		title: MainColumnTitles.SIZE,
		dataIndex: 'size',
		renderSetup: () => {
			return (size?: number) => {
				if (size && size > 0) {
					// return 3 points of precision
					const strNum = `${size}`;
					const power = strNum.length;
					const digit1 = strNum[0];
					const digit2 = strNum[1];
					let digit3 = strNum[2];
					const digit4 = strNum[3];
					let sizeStr = '';
					if (!digit4) {
						sizeStr = `${strNum} B`;
					} else {
						digit3 = parseInt(digit4, 10) >= 5 ? `${parseInt(digit3, 10) + 1}` : digit3;

						let descriptor = ' B';
						if (power > 3) {
							if (power > 6) {
								if (power > 9) {
									descriptor = ' GB';
								} else {
									descriptor = ' MB';
								}
							} else {
								descriptor = ' KB';
							}
						}

						let value = `${digit1}${digit2}${digit3}`;
						const decimal = power % 3;
						if (decimal === 1) {
							value = `${digit1}.${digit2}${digit3}`;
						} else if (decimal === 2) {
							value = `${digit1}${digit2}.${digit3}`;
						}
						sizeStr = value + descriptor;
					}
					let color = 'green'; // under 1 MB is green
					if (size > 1000000) {
						if (size < 5000000) {
							// under 5 MB is cyan
							color = 'cyan';
						} else if (size < 50000000) {
							// under 50 MB is blue
							color = 'blue';
						} else if (size < 1000000000) {
							// under 1 GB is geekblue
							color = 'geekblue';
						} else if (size < 5000000000) {
							// under 5 GB is purple
							color = 'purple';
						} else {
							color = 'magenta';
						}
					}
					return (
						<Tag color={color} key="size">
							{sizeStr}
						</Tag>
					);
				}
				return null;
			};
		}
	},
	{
		title: MainColumnTitles.LAST_UPDATE,
		dataIndex: 'lastUpdate',
		renderSetup: () => {
			return (date: Date) => {
				return formatDateStr(date);
			};
		}
	},
	{
		title: MainColumnTitles.DATE_ADDED,
		dataIndex: 'dateAdded',
		renderSetup: () => {
			return (date: Date) => {
				return formatDateStr(date);
			};
		}
	},
	{
		title: MainColumnTitles.TAGS,
		dataIndex: 'tags',
		// eslint-disable-next-line @typescript-eslint/ban-types
		renderSetup: (props: CollectionViewProps) => {
			const { config } = props;
			const small = (config as MainCollectionConfig | undefined)?.smallRows;
			return (tags: string[] | undefined) => {
				const iconTags: CorpType[] = [];
				const actualTags: string[] = [];
				(tags || [])
					.filter((tag) => tag.toLowerCase() !== 'mods')
					.forEach((tag: string) => {
						const corp = getCorpType(tag);
						if (corp) {
							iconTags.push(corp);
						} else {
							actualTags.push(tag);
						}
					});
				return [
					...actualTags.map((tag) => (
						<Tag color="blue" key={tag}>
							{tag}
						</Tag>
					)),
					...iconTags.map((corp) => getCorpIcon(corp, small ? 20 : 35))
				];
			};
		}
	}
];

class MainCollectionComponent extends Component<CollectionViewProps, MainCollectionState> {
	constructor(props: CollectionViewProps) {
		super(props);
		this.state = {};
	}

	getRowSelection() {
		const { collection, rows, filteredRows } = this.props;
		const { setEnabledModsCallback, setEnabledCallback, setDisabledCallback } = this.props;

		// eslint-disable-next-line @typescript-eslint/ban-types
		const rowSelection: TableRowSelection<DisplayModData> = {
			selections: [Table.SELECTION_INVERT],
			selectedRowKeys: collection.mods,
			onChange: (selectedRowKeys: React.Key[]) => {
				const currentVisible = new Set(filteredRows.map((modData) => modData.uid));
				const currentSelection = collection.mods;
				const newSelection = rows
					.map((modData) => modData.uid)
					.filter((mod) => {
						return (!currentVisible.has(mod) && currentSelection.includes(mod)) || selectedRowKeys.includes(mod);
					});
				setEnabledModsCallback(new Set(newSelection));
			},
			onSelect: (record: DisplayModData, selected: boolean) => {
				api.logger.debug(`selecting ${record.uid}: ${selected}`);
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
				api.logger.debug(`selecting all: ${selected}`);
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
				api.logger.debug(`inverting selection`);
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
				api.logger.debug(`clearing selection`);
				const currentVisible = filteredRows.map((modData) => modData.uid);
				const selected = new Set(collection.mods);
				currentVisible.forEach((mod) => {
					selected.delete(mod);
				});
				setEnabledModsCallback(selected);
			}
		};

		return rowSelection;
	}

	getColumnSchema(): ColumnType<DisplayModData>[] {
		const { config } = this.props;
		let activeColumns: ColumnSchema<DisplayModData>[] = MAIN_COLUMN_SCHEMA;
		const columnActiveConfig = (config as MainCollectionConfig | undefined)?.columnActiveConfig;
		if (columnActiveConfig) {
			activeColumns = activeColumns.filter(
				(colSchema) => columnActiveConfig[colSchema.title] || columnActiveConfig[colSchema.title] === undefined
			);
		}
		return activeColumns.map((colSchema: ColumnSchema<DisplayModData>) => {
			const { title, dataIndex, className, width, defaultSortOrder, sorter, align, renderSetup } = colSchema;
			return {
				title,
				dataIndex,
				className,
				width,
				defaultSortOrder,
				sorter,
				align,
				render: renderSetup ? renderSetup(this.props) : undefined
			};
		});
	}

	render() {
		const { filteredRows, launchingGame } = this.props;
		// <img src={cellData} height="50px" width="50px" />
		// <div>
		/*
		{cellData === ModType.WORKSHOP
			? steam
			: cellData === ModType.TTQMM
			? ttmm
			: local}
			*/

		// eslint-disable-next-line @typescript-eslint/ban-types

		return (
			// eslint-disable-next-line react/destructuring-assignment
			<Layout style={{ width: this.props.width, height: this.props.height }}>
				<Content key="main table" style={{ padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' }}>
					<Table
						dataSource={filteredRows}
						pagination={false}
						loading={launchingGame}
						size="small"
						rowKey="uid"
						rowSelection={this.getRowSelection()}
						columns={this.getColumnSchema()}
						sticky
						onRow={(record, rowIndex) => {
							return {
								onDoubleClick: (event) => {
									api.logger.debug(`Double clicking ${record.uid}, ${event}`);
									// this.props.getModDetails(record.uid, record, true);
								},
								onContextMenu: (event) => {
									api.logger.debug(`Showing context menu for ${record.uid}, ${event}`);
									const { screenX, screenY } = event;
									api.send(ValidChannel.OPEN_MOD_CONTEXT_MENU, record, screenX, screenY);
								}
							};
						}}
					/>
				</Content>
			</Layout>
		);
	}
}

export default () => {
	return <MainCollectionComponent {...useOutletContext()} />;
};
