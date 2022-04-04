/* eslint-disable no-nested-ternary */
import React, { Component, CSSProperties, ReactNode } from 'react';
import { Layout, Button, Typography, Col, Row, Tabs, Image, Space, Card, PageHeader, Descriptions, Tag } from 'antd';
import { CloseOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import { SizeMe } from 'react-sizeme';
import { AppState, DisplayModData, ModData } from 'model';
import { formatDateStr } from 'util/Date';

import missing from '../../../../assets/missing.png';

const { Header, Footer, Content } = Layout;
const { TabPane } = Tabs;
const { Meta } = Card;
const { Text, Paragraph } = Typography;

function getImagePreview(path?: string) {
	return (
		<Card className="ModDetailFooterPreview" style={{ width: '100%', padding: 10 }}>
			<Image src={path} fallback={missing} width="100%" />
		</Card>
	);
}

interface ModDetailsFooterProps {
	bigDetails: boolean;
	appState: AppState;
	currentRecord: DisplayModData;
	expandFooterCallback: (expand: boolean) => void;
	closeFooterCallback: () => void;
	// eslint-disable-next-line react/no-unused-prop-types
	enableModCallback: (uid: string) => void;
	// eslint-disable-next-line react/no-unused-prop-types
	disableModCallback: (uid: string) => void;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export default class ModDetailsFooter extends Component<ModDetailsFooterProps, {}> {
	constructor(props: ModDetailsFooterProps) {
		super(props);
		this.state = {};
	}

	renderInfoTab() {
		const { appState, currentRecord } = this.props;

		const descriptionLines = currentRecord.description ? currentRecord.description.split(/\r?\n/) : [];

		return (
			<Descriptions column={2} bordered>
				<Descriptions.Item label="Author">{currentRecord.authors}</Descriptions.Item>
				<Descriptions.Item label="Tags">
					{currentRecord.tags?.map((tag) => (
						<Tag key={tag}>{tag}</Tag>
					))}
				</Descriptions.Item>
				<Descriptions.Item label="Created">{formatDateStr(currentRecord.dateCreated)}</Descriptions.Item>
				<Descriptions.Item label="Installed">{formatDateStr(currentRecord.dateAdded)}</Descriptions.Item>
				<Descriptions.Item label="Description">
					<div>
						{descriptionLines.map((line) => (
							<Paragraph>{line}</Paragraph>
						))}
					</div>
				</Descriptions.Item>
			</Descriptions>
		);
	}

	renderInspectTab() {
		const { appState, currentRecord } = this.props;
		return JSON.stringify(currentRecord, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
	}

	renderDependenciesTab() {
		const { appState, currentRecord } = this.props;
		return JSON.stringify(currentRecord.dependsOn, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
	}

	render() {
		const { bigDetails, currentRecord, closeFooterCallback, expandFooterCallback } = this.props;
		const normalStyle = { minHeight: '25%', maxHeight: 400, margin: 10 };
		const bigStyle = { height: '100%' };
		return (
			<Content style={bigDetails ? bigStyle : normalStyle}>
				<PageHeader
					title={currentRecord.name}
					subTitle={`${currentRecord.id} (${currentRecord.uid})`}
					style={{ width: '100%' }}
					extra={
						<Space>
							<Button icon={<CloseOutlined />} type="text" onClick={closeFooterCallback} />
						</Space>
					}
				/>
				<Row key="mod-details" justify="space-between" gutter={16} style={{ height: '100%' }}>
					<Col span={2} lg={4}>
						{getImagePreview(currentRecord.preview)}
					</Col>
					<Col span={22} lg={20}>
						<SizeMe monitorHeight refreshMode="debounce">
							{({ size }) => {
								const contentStyle: React.CSSProperties = { overflowY: 'auto' };
								if (size.height) {
									contentStyle.height = size.height;
								}
								return (
									<Content style={contentStyle}>
										<Tabs defaultActiveKey="info">
											<TabPane tab="Info" key="info">
												{this.renderInfoTab()}
											</TabPane>
											<TabPane tab="Inspect" key="inspect">
												{this.renderInspectTab()}
											</TabPane>
											<TabPane tab="Dependencies" key="dependencies">
												{this.renderDependenciesTab()}
											</TabPane>
										</Tabs>
									</Content>
								);
							}}
						</SizeMe>
					</Col>
				</Row>
			</Content>
		);
	}
}
