import React, { Component } from 'react';
import ttmm from '../../../../assets/ttmm.png';
import steam from '../../../../assets/steam.png';
import local from '../../../../assets/local.png';
import { Mod, ModType } from 'renderer/model/Mod';
import { ModCollection } from 'renderer/model/ModCollection';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import { styled } from '@mui/material/styles';
import { AutoSizer, Column, Table } from 'react-virtualized';
import { withStyles, WithStyles } from "@mui/styles";
import { Theme, createTheme } from "@mui/material/styles";


interface ModCollectionProps{
	collection: ModCollection,
	mods: Map<string, Mod>,
	forceUpdate: boolean,
	setEnabledModsCallback: (mods: Set<string>) => any,
	setDisabledModsCallback: (mods: Set<string>) => any,
	setAllEnabledCallback: () => any,
	clearAllEnabledCallback: () => any,
	setEnabledCallback: (mod: string) => any,
	setDisabledCallback: (mod: string) => any
}

interface ModData {
	id: string,
	type: ModType,
	preview?: string,
	name: string,
	description?: string,
	author?: string,
	dependsOn?: string[]
}

interface ModCollectionState {
	search?: string;
	rows: ModData[]
}

const columns = [
	{field: 'type', headerName: '', width: 150},
	{field: 'preview', headerName: 'Preview', width: 150},
	{field: 'name', headerName: 'Name', width: 150},
	{field: 'author', headerName: 'Author', width: 150},
	{field: 'description', headerName: 'Description', width: 150}
]

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const styles = (theme: Theme) =>
  ({
    flexContainer: {
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box"
    },
    table: {
      // temporary right-to-left patch, waiting for
      // https://github.com/bvaughn/react-virtualized/issues/454
      "& .ReactVirtualized__Table__headerRow": {
        ...(theme.direction === "rtl" && {
          paddingLeft: "0 !important"
        }),
        ...(theme.direction !== "rtl" && {
          paddingRight: undefined
        })
      }
    },
    tableRow: {
      cursor: "pointer"
    },
    tableRowHover: {
      "&:hover": {
        backgroundColor: theme.palette.grey[200]
      }
    },
    tableCell: {
      flex: 1
    },
    noClick: {
      cursor: "initial"
    }
  } as const);

interface HeaderRowRendererParams {
	className: string;
	columns: Array<any>;
	style: any;
};

interface RowRendererParams {
	className: string;
	columns: Array<any>;
	index: number;
	isScrolling: boolean;
	onRowClick?: Function;
	onRowDoubleClick?: Function;
	onRowMouseOver?: Function;
	onRowMouseOut?: Function;
	onRowRightClick?: Function;
	rowData: any;
	style: any;
	key: string;
};

class CollectionComponent extends Component<ModCollectionProps, ModCollectionState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: ModCollectionProps) {
		super(props);
		const rows: ModData[] = this.props.mods ? this.convertToModData(this.props.mods) : [];
		this.state = {
			rows: rows
		};
	}

	convertToModData(input: Map<string, Mod>): ModData[] {
		return [...input.values()].map((mod: Mod) => {
			return {
				id: mod.ID,
				type: mod.type,
				preview: mod.config?.preview,
				name: mod.config && mod.config.name ? mod.config.name : mod.ID,
				description: mod.config?.description,
				author: mod.config?.author,
				dependsOn: mod.config?.dependsOn
			}
		});
	}

	shouldComponentUpdate(nextProps: ModCollectionProps) {
		return true;
		// return nextProps.forceUpdate;
	}

	handleSelectAllClick(event: any) {
		if (event.target.checked) {
			this.props.setAllEnabledCallback();
		}
		else {
			this.props.clearAllEnabledCallback();
		}
		this.setState({});
  };

  handleClick(event: any, id: string) {
		if (event.target.checked) {
			this.props.setEnabledCallback(id);
		}
		else {
			this.props.setDisabledCallback(id);
		}
		this.setState({});
  };

	disableMod(id: string) {

	}

	enableMod(id: string) {

	}

	enableDropdown(id: string) {

	}

	renderRow({
		className,
		columns,
		index,
		key,
		onRowClick,
		onRowDoubleClick,
		onRowMouseOut,
		onRowMouseOver,
		onRowRightClick,
		rowData,
		style,
	}: RowRendererParams) {
		const a11yProps: any = {'aria-rowindex': index + 1};

		if (
			onRowClick ||
			onRowDoubleClick ||
			onRowMouseOut ||
			onRowMouseOver ||
			onRowRightClick
		) {
			a11yProps['aria-label'] = 'row';
			a11yProps.tabIndex = 0;

			if (onRowClick) {
				a11yProps.onClick = (event: any) => onRowClick({event, index, rowData});
			}
			if (onRowDoubleClick) {
				a11yProps.onDoubleClick = (event: any) =>
					onRowDoubleClick({event, index, rowData});
			}
			if (onRowMouseOut) {
				a11yProps.onMouseOut = (event: any) => onRowMouseOut({event, index, rowData});
			}
			if (onRowMouseOver) {
				a11yProps.onMouseOver = (event: any) => onRowMouseOver({event, index, rowData});
			}
			if (onRowRightClick) {
				a11yProps.onContextMenu = (event: any) =>
					onRowRightClick({event, index, rowData});
			}
		}
		console.log(columns);

		return (
			<span
				{...a11yProps}
				className={className}
				key={key}
				role="row"
				style={Object.assign(style, {
					display: 'flex',
					'flex-direction': 'row',
					'flex-grow': 1,
					'flex-flow': 'column wrap'
				})}
			>
				{columns}
			</span>
		);
	}

	renderHeader({
		className,
		columns,
		style,
	}: HeaderRowRendererParams) {
		return (
			<div className={className} role="row" style={Object.assign(style, {
				display: 'flex',
				'flex-direction': 'row',
				'flex-grow': 1,
				'flex-flow': 'column wrap'
			})}>
				{columns}
			</div>
		);
	}

	render() {
		console.log(this.state.rows);
		return (
			<div style={{ flex: '1 1 auto' }}>
				<AutoSizer>
					{({ height, width }) => (
						<Table
							height={height}
							width={width}
							headerHeight={75}
							rowCount={this.state.rows.length}
							rowRenderer={this.renderRow}
							headerRowRenderer={this.renderHeader}
							rowGetter={({ index }) => {
								return this.state.rows[index];
							}}
							gridStyle={{
								direction: 'vertical',
							}}
							rowHeight={50}
							onRowClick={({rowData}) => {
								const currentSelection = this.props.collection.mods.has(rowData.id);
								if (currentSelection) {
									this.disableMod(rowData.id);
								}
								else {
									this.enableMod(rowData.id);
								}
							}}
							onRowRightClick={({rowData}: {rowData: ModData}) => {
								this.enableDropdown(rowData.id);
							}}
						>
							<Column
								dataKey="selected"
								key="selected"
								width={25}
								minWidth={25}
								maxWidth={25}
								headerRenderer={() => {
									return <div><Checkbox
										color="primary"
										indeterminate={this.props.collection.mods.size > 0 && this.props.collection.mods.size < this.state.rows.length
										}
										checked={this.state.rows.length > 0 && this.props.collection.mods.size === this.state.rows.length
										}
										onChange={(event) => {this.handleSelectAllClick(event)}}
										inputProps={{
											'aria-label': 'select all desserts',
										}}
									/></div>;
								}}
								cellRenderer={({cellData}) => {
									return <div><Checkbox
										color="primary"
										checked={cellData}
										inputProps={{
											'aria-labelledby': `enhanced-table-checkbox-select-mod`
										}}
									/></div>
								}}
								cellDataGetter={({rowData}) => {
									return this.props.collection.mods.has(rowData.id)
								}}
							/>
							<Column
								dataKey="preview"
								key="preview"
								width={50}
								minWidth={50}
								maxWidth={50}
								style={{ height: 50 }}
								cellRenderer={({cellData}) => {
									return <div><img src={cellData} height='50px' width='50px'/></div>
								}}
							/>
							<Column
								dataKey="type"
								key="type"
								width={25}
								minWidth={25}
								maxWidth={25}
								cellRenderer={({cellData}) => {
									return <div>
									{cellData === ModType.WORKSHOP ? steam : cellData === ModType.TTQMM ? ttmm : local}
									</div>;
								}}
							/>
							<Column
								dataKey="name"
								key="name"
								width={100}
								minWidth={100}
							/>
							<Column
								dataKey="author"
								key="author"
								width={75}
								minWidth={75}
								cellDataGetter={({rowData}) => {
									return this.props.collection.mods.has(rowData.id)
								}}
							/>
							<Column
								dataKey="description"
								key="description"
								width={150}
								minWidth={75}
							/>
						</Table>
					)}
				</AutoSizer>
			</div>
		);
	}
}

const defaultTheme = createTheme();
export const ModCollectionComponent =  withStyles(styles, { defaultTheme })(
  CollectionComponent
);
