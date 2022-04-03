/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout, Skeleton } from 'antd';
import { useOutletContext } from 'react-router-dom';
import React, { Component } from 'react';
import { CollectionViewProps } from 'model';

const { Content } = Layout;

class RawCollectionComponent extends Component<CollectionViewProps, never> {
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

export default () => {
	return <RawCollectionComponent {...useOutletContext<CollectionViewProps>()} />;
};
