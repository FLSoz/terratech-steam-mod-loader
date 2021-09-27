import React, { Component } from 'react';
import icon from '../../../assets/icon.svg';
import ttmm from '../../../assets/ttmm.png';
import steam from '../../../assets/steam.png';
import local from '../../../assets/local.png';
import { DEFAULT_WORKSHOP_ID, TT_APP_ID } from '../Constants';
import { AppState } from '../model/AppState';
import { RouteComponentProps, withRouter } from 'react-router';

import { Mod, ModType } from '../model/Mod';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { AddBoxOutlined, FileCopyOutlined, DeleteForeverOutlined } from '@mui/icons-material';
import TableFooter from '@mui/material/TableFooter';
import {ModCollectionComponent} from './components/ModCollectionComponent';
import { VirtualizedTable } from './components/VirtualizedTable';
import { AutoSizer } from 'react-virtualized';
import Container from '@mui/material/Container';
import { Button, ButtonGroup, Divider, Grid, makeStyles, Stack } from '@mui/material';
import { Box } from '@mui/system';


const columns = [
	{field: 'preview', headerName: 'Preview', width: 150},
	{field: 'type', headerName: null, width: 150},
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

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
	alignContent: 'center',
	alignSelf: 'center'
}));

class MainView extends Component<RouteComponentProps, AppState> {
	CONFIG_PATH: string | undefined = undefined;

	constructor(props: any) {
		super(props);
		const appState = props.location.state as AppState;
		this.state = appState;

		this.handleSelectAllClick = this.handleSelectAllClick.bind(this);
		this.handleClick = this.handleClick.bind(this);
		// this.isItemSelected = this.isItemSelected.bind(this);
	}

	componentDidMount() {
	}

	setStateCallback(update: AppState) {
		this.setState(update);
	}

	refreshMods() {
		this.props.history.push('/mods', this.state);
	}

	handleSelectAllClick(event: any) {
		if (this.state.mods && this.state.activeCollection) {
			if (event.target.checked) {
				for (const mod of this.state.mods.values()) {
					this.state.activeCollection.mods.add(mod.ID);
				}
			}
			else {
				this.state.activeCollection.mods.clear();
			}
		}
		this.setState({});
  };

  handleClick(event: any, id: string) {
		if (this.state.activeCollection) {
			if (event.target.checked) {
				this.state.activeCollection.mods.add(id);
			}
			else {
				this.state.activeCollection.mods.delete(id);
			}
		}
		this.setState({});
  };

	isItemSelected(id: string): boolean {
		return this.state.activeCollection ? this.state.activeCollection.mods.has(id) : false;
	}

	updatedActiveCollection(): boolean {
		return false;
	}

	render() {
		console.log(this.state.mods ? [...this.state.mods.values()].length : "FAILED");
		const rows = this.state.mods ? [...this.state.mods?.values()].map((mod: Mod) => {
			return {
				id: mod.ID,
				type: mod.type,
				preview: mod.config?.preview,
				name: mod.config ? mod.config.name : mod.ID,
				description: mod.config?.description,
				author: mod.config?.author,
				dependsOn: mod.config?.dependsOn
			}
		}): [];

		/*
		if (this.state.mods && this.state.activeCollection) {
			return (
				<div style={{ display: 'flex', width: 1024, height: 728 }}>
					<ModCollectionComponent
						mods={this.state.mods}
						forceUpdate={this.updatedActiveCollection()}
						collection={this.state.activeCollection}
						setEnabledModsCallback={(mods) => {
							if (this.state.activeCollection) {
								mods.forEach(element => {
									this.state.activeCollection?.mods.add(element);
								});
							}
						}}
						setDisabledModsCallback={(mods) => {
							if (this.state.activeCollection) {
								mods.forEach(element => {
									this.state.activeCollection?.mods.delete(element);
								});
							}
						}}
						setAllEnabledCallback={() => {this.handleSelectAllClick(true)}}
						clearAllEnabledCallback={() => {this.handleSelectAllClick(false)}}
						setEnabledCallback={(id) => {this.handleClick(true, id)}}
						setDisabledCallback={(id) => {this.handleClick(false, id)}}
					/>
				</div>
			);
		} */
		return (
			<Stack
				spacing={2}
				alignItems="center"
				divider={<Divider orientation="horizontal" flexItem />}
				justifyContent="space-between"
				sx={{height: '90%', width: '90%', m: 0}}
			>
				<Grid container spacing={2} width='95%' justifyContent="space-between" alignItems="center">
					<Grid item xs={8}>
						<ButtonGroup variant="contained" aria-label="split button">
							<Button sx={{width: '100%'}} >COLLECTION NAME</Button>
							<Button
								size="small"
								aria-controls={'split-button-menu'}
								aria-expanded={'true'}
								aria-label="select merge strategy"
								aria-haspopup="menu"
							>
								<ArrowDropDownIcon />
							</Button>
						</ButtonGroup>
					</Grid>
					<Grid xs={4} item
						container
						direction="column"
						alignItems="center"
					>
						<ButtonGroup variant="contained" sx={{alignContent: 'right'}}>
							<Button startIcon={<AddBoxOutlined/>}>New</Button>
							<Button startIcon={<FileCopyOutlined/>}>Copy</Button>
							<Button variant="contained" startIcon={<DeleteForeverOutlined/>}> Delete</Button>
						</ButtonGroup>
					</Grid>
				</Grid>
				<Grid container spacing={2} sx={{m: 0}} width='95%' justifyContent="space-between" alignItems="center">
					<Grid item xs={8}>
						<Item>Item 1</Item>
					</Grid>
					<Grid item xs={4}>
						<Item>Item 2</Item>
					</Grid>
				</Grid>
				<div style={{ flex: '1 1 auto', height: '80%', width: '100%' }}>
					<TableContainer component={Paper} style={{overflowY: 'scroll', height: '100%', width: '100%'}} >
						<Table
							aria-label="customized table"
							stickyHeader={true}
						>
							<TableHead>
								<TableRow>
									<StyledTableCell padding="checkbox" key="selected">
										<Checkbox
											color="primary"
											indeterminate={this.state.activeCollection && this.state.mods
												? this.state.activeCollection.mods.size > 0 && this.state.activeCollection.mods.size < this.state.mods.size
												: false
											}
											checked={this.state.mods && this.state.activeCollection
												? this.state.mods.size > 0 && this.state.activeCollection.mods.size === this.state.mods.size
												: false
											}
											onChange={this.handleSelectAllClick}
											inputProps={{
												'aria-label': 'select all desserts',
											}}
										/>
									</StyledTableCell>
									{
										columns.map((col) => {
											return <StyledTableCell key={col.field}>{col.headerName}</StyledTableCell>
										})
									}
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((row) => (
									<StyledTableRow
										key={row.id}
										hover
										onClick={(event) => this.handleClick(event, row.id)}
										role="checkbox"
										aria-checked={this.isItemSelected(row.id)}
										tabIndex={-1}
										selected={this.isItemSelected(row.id)}
									>
										<TableCell padding="checkbox" key="selected" sx={{height:'64px', width:'30px'}} align='center'>
											<Checkbox
												color="primary"
												checked={this.isItemSelected(row.id)}
												inputProps={{
													'aria-labelledby': `enhanced-table-checkbox-${row.id}`,
												}}
											/>
										</TableCell>
										<StyledTableCell key="preview" sx={{height:'64px'}} width={'64px'}><img src={row.preview} height='64px' width='64px'/></StyledTableCell>
										<StyledTableCell key="type" width={'64px'}><img src={row.type === ModType.WORKSHOP ? steam : row.type === ModType.TTQMM ? ttmm : local} height='25px' width='25px'/></StyledTableCell>
										<StyledTableCell key="name" width='160px'>{row.name}</StyledTableCell>
										<StyledTableCell key="author" width='100px'>{row.author}</StyledTableCell>
										<StyledTableCell key="description">{row.description}</StyledTableCell>
									</StyledTableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</div>
				<Button variant="contained">Launch Game</Button>
			</Stack>
		);
	}
}
export default withRouter(MainView);
