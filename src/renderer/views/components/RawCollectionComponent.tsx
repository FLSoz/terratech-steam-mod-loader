/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout, Table, Tag, Space, Button, Modal, Tooltip, Image, Skeleton } from 'antd';
import { useOutletContext, Outlet } from 'react-router-dom';
import React, { Component, ReactNode } from 'react';
import { DeploymentUnitOutlined, FileImageOutlined, ShareAltOutlined, CodeOutlined, ZoomInOutlined, CloseOutlined } from '@ant-design/icons';
import parse from 'html-react-parser';

import { ColumnType } from 'antd/lib/table';
import { TableRowSelection } from 'antd/lib/table/interface';
import { api } from 'renderer/model/Api';
import { Mod, ModData, ModType } from 'renderer/model/Mod';
import { ModCollection, ModCollectionProps } from 'renderer/model/ModCollection';

const { Content } = Layout;

class RawCollectionComponent extends Component<ModCollectionProps, never> {
	componentDidMount() {
		this.setState({});
	}

	render() {
		// const { collection, rows, filteredRows, setEnabledModsCallback, setEnabledCallback, setDisabledCallback } = this.props;
		// <img src={cellData} height="50px" width="50px" />
		// <div>
		/*
		{cellData === ModType.WORKSHOP
			? steam
			: cellData === ModType.TTQMM
			? ttmm
			: local}
			*/

		return (
			// eslint-disable-next-line react/destructuring-assignment
			<Layout style={{ width: this.props.width, height: this.props.height }}>
				<Content key="main table" style={{ padding: '0px', overflowY: 'auto', scrollbarWidth: 'none' }}>
					<Skeleton />
				</Content>
			</Layout>
		);
	}
}

export default (props: any) => {
	return <RawCollectionComponent {...useOutletContext<ModCollectionProps>()} />;
};
