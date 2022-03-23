/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout, Table, Tag, Space, Tooltip, Image } from 'antd';
import { useOutletContext } from 'react-router-dom';
import React, { Component } from 'react';
import { ColumnType } from 'antd/lib/table';
import dateFormat from 'dateformat';
import { TableRowSelection } from 'antd/lib/table/interface';
import { api } from 'renderer/model/Api';
import { ModData, ModError, ModErrorType, ModType } from 'renderer/model/Mod';
import { ModCollectionProps } from 'renderer/model/ModCollection';
import local from '../../../../assets/local.png';
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

function getImageSrcFromType(type: ModType, size = 15) {
	switch (type) {
		case ModType.LOCAL:
			return (
				<Tooltip title="This is a local mod">
					<img src={local} width={size} alt="" key="type" />
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
			return (
				<Tooltip title="This is a local mod">
					<img src={local} width={size} alt="" key="type" />
				</Tooltip>
			);
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

class MainCollectionComponent extends Component<ModCollectionProps, never> {
	ZERO_DATE: Date = new Date(0);

	componentDidMount() {
		this.setState({});
	}

	render() {
		const { collection, rows, filteredRows, lastValidationStatus } = this.props;
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
			onSelect: (record: ModData, selected: boolean) => {
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

		const small = true;
		// eslint-disable-next-line @typescript-eslint/ban-types
		const columns: ColumnType<ModData>[] = [
			{
				title: 'Type',
				dataIndex: 'type',
				render: (type: ModType) => getImageSrcFromType(type, small ? 20 : 35),
				width: 65,
				align: 'center'
			},
			{
				title: 'Name',
				dataIndex: 'name',
				defaultSortOrder: 'ascend',
				sorter: (a, b) => (a.name > b.name ? 1 : -1)
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
						return <Tag key={author}>{author}</Tag>;
					});
				}
			},
			{
				title: 'ID',
				dataIndex: 'id',
				sorter: (a, b) => (a.id > b.id ? 1 : -1)
			},
			{
				title: 'State',
				dataIndex: 'errors',
				render: (errors: ModError[] | undefined, record: ModData) => {
					const selectedMods = collection.mods;
					if (!selectedMods.includes(record.uid)) {
						if (!record.subscribed && record.workshopId && record.workshopId.length > 0) {
							return <Tag key="notSubscribed">Not subscribed</Tag>;
						}
						if (record.subscribed && !record.installed) {
							return <Tag key="notInstalled">Not installed</Tag>;
						}
						return null;
					}
					if (errors && errors.length > 0) {
						return errors.map((modError: ModError) => {
							let errorText = modError.errorType.toString();
							let errorColor: string | undefined = 'red';
							switch (modError.errorType) {
								case ModErrorType.INCOMPATIBLE_MODS:
									errorText = 'Conflicts';
									break;
								case ModErrorType.INVALID_ID:
									errorText = 'Invalid';
									errorColor = 'volcano';
									break;
								case ModErrorType.MISSING_DEPENDENCY:
									errorText = 'Missing dependencies';
									errorColor = 'orange';
									break;
								case ModErrorType.NOT_SUBSCRIBED:
									errorText = 'Not subscribed';
									errorColor = 'yellow';
									break;
								default:
									break;
							}
							return (
								<Tag key={modError.errorType} color={errorColor}>
									{errorText}
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
			},
			{
				title: 'Size',
				dataIndex: 'size',
				render: (size?: number) => {
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
				}
			},
			{
				title: 'Last Update',
				dataIndex: 'lastUpdate',
				render: (date: Date) => {
					return date && date > this.ZERO_DATE ? dateFormat(date, 'yyyy-mm-dd h:MM TT') : '';
				}
			},
			{
				title: 'Date Added',
				dataIndex: 'dateAdded',
				render: (date: Date) => {
					return date && date > this.ZERO_DATE ? dateFormat(date, 'yyyy-mm-dd h:MM TT') : '';
				}
			},
			{
				title: 'Tags',
				dataIndex: 'tags',
				// eslint-disable-next-line @typescript-eslint/ban-types
				render: (tags: string[] | undefined, record: ModData) => {
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
				}
			}
		];

		return (
			// eslint-disable-next-line react/destructuring-assignment
			<Layout style={{ width: this.props.width, height: this.props.height }}>
				<Content key="main table" style={{ padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' }}>
					<Table
						dataSource={filteredRows}
						pagination={false}
						size="small"
						rowKey="uid"
						rowSelection={rowSelection}
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
