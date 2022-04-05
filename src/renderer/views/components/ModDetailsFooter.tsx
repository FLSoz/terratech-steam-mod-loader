/* eslint-disable no-nested-ternary */
import React, { Component, CSSProperties, ReactNode } from 'react';
import { Layout, Button, Typography, Col, Row, Tabs, Image, Space, Card, PageHeader, Descriptions, Tag, Collapse } from 'antd';
import { CloseOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import { SizeMe } from 'react-sizeme';
import { AppState, DisplayModData, ModData } from 'model';
import { formatDateStr } from 'util/Date';

import missing from '../../../../assets/missing.png';

const { Header, Footer, Content } = Layout;
const { Panel } = Collapse;
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
		const { currentRecord } = this.props;

		const descriptionLines = currentRecord.description ? currentRecord.description.split(/\r?\n/) : [];

		return (
			<Descriptions column={2} bordered size="small">
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
						{descriptionLines.map((line, index) => (
							// eslint-disable-next-line react/no-array-index-key
							<Paragraph key={index}>{line}</Paragraph>
						))}
					</div>
				</Descriptions.Item>
			</Descriptions>
		);
	}

	renderInspectTab() {
		const { appState, currentRecord } = this.props;
		const { activeCollection } = appState;

		// return JSON.stringify(currentRecord, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
		return (
			<Collapse className="ModDetailInspect" defaultActiveKey={['info', 'properties', 'status']}>
				<Panel header="Mod Info" key="info">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="Author">{currentRecord.authors}</Descriptions.Item>
						<Descriptions.Item label="Description">{currentRecord.description}</Descriptions.Item>
						<Descriptions.Item label="ID">{currentRecord.id}</Descriptions.Item>
						<Descriptions.Item label="UID">{currentRecord.uid}</Descriptions.Item>
						<Descriptions.Item label="Name">{currentRecord.name}</Descriptions.Item>
						<Descriptions.Item label="Tags">{currentRecord.tags ? currentRecord.tags.join(', ') : null}</Descriptions.Item>
					</Descriptions>
				</Panel>
				<Panel header="Mod Properties" key="properties">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="BrowserLink">
							{currentRecord.workshopID ? `https://steamcommunity.com/sharedfiles/filedetails/?id=${currentRecord.workshopID}` : null}
						</Descriptions.Item>
						<Descriptions.Item label="Requires RR">UNKNOWN</Descriptions.Item>
						<Descriptions.Item label="Has Code">{(!!currentRecord.hasCode).toString()}</Descriptions.Item>
						<Descriptions.Item label="Date Added">{formatDateStr(currentRecord.dateAdded)}</Descriptions.Item>
						<Descriptions.Item label="Date Created">{formatDateStr(currentRecord.dateCreated)}</Descriptions.Item>
						<Descriptions.Item label="Date Updated">{formatDateStr(currentRecord.lastUpdate)}</Descriptions.Item>
						<Descriptions.Item label="Image">{currentRecord.preview}</Descriptions.Item>
						<Descriptions.Item label="Path">{currentRecord.path}</Descriptions.Item>
						<Descriptions.Item label="Size">{currentRecord.size}</Descriptions.Item>
						<Descriptions.Item label="Source">{currentRecord.type}</Descriptions.Item>
						<Descriptions.Item label="SteamLink">
							{currentRecord.workshopID ? `steam://url/CommunityFilePage/${currentRecord.workshopID}` : null}
						</Descriptions.Item>
						<Descriptions.Item label="WorkshopID">
							{currentRecord.workshopID ? currentRecord.workshopID.toString() : null}
						</Descriptions.Item>
					</Descriptions>
				</Panel>
				<Panel header="Mod Status" key="status">
					<Descriptions column={1} bordered size="small" labelStyle={{ width: 150 }}>
						<Descriptions.Item label="Subscribed">{(!!currentRecord.subscribed).toString()}</Descriptions.Item>
						<Descriptions.Item label="Downloading">{(!!currentRecord.downloading).toString()}</Descriptions.Item>
						<Descriptions.Item label="Download Pending">{(!!currentRecord.downloadPending).toString()}</Descriptions.Item>
						<Descriptions.Item label="Needs Update">{(!!currentRecord.needsUpdate).toString()}</Descriptions.Item>
						<Descriptions.Item label="Is Installed">{(!!currentRecord.installed).toString()}</Descriptions.Item>
						<Descriptions.Item label="Is Active">
							{(!!activeCollection && activeCollection.mods.includes(currentRecord.uid)).toString()}
						</Descriptions.Item>
					</Descriptions>
				</Panel>
			</Collapse>
		);
	}

	renderDependenciesTab() {
		const { appState, currentRecord } = this.props;
		return JSON.stringify(currentRecord.dependsOn, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
	}

	render() {
		const { bigDetails, currentRecord, closeFooterCallback, expandFooterCallback } = this.props;
		const normalStyle = { minHeight: '25%', maxHeight: 400 };
		const bigStyle = {};
		return (
			<Content className="ModDetailFooter" style={bigDetails ? bigStyle : normalStyle}>
				<PageHeader
					title={currentRecord.name}
					subTitle={`${currentRecord.id} (${currentRecord.uid})`}
					style={{ width: '100%', height: 48 }}
					extra={
						<Space>
							<Button
								icon={bigDetails ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
								type="text"
								onClick={() => {
									expandFooterCallback(!bigDetails);
								}}
							/>
							<Button icon={<CloseOutlined />} type="text" onClick={closeFooterCallback} />
						</Space>
					}
				/>
				<Row key="mod-details" justify="space-between" gutter={16} style={{ height: 'calc(100% - 48px)' }}>
					<Col span={2} lg={4} style={{ paddingLeft: 10 }}>
						{getImagePreview(currentRecord.preview)}
					</Col>
					<Col span={22} lg={20} style={{ height: '100%' }}>
						<Content style={{ overflowY: 'auto', paddingBottom: 10, paddingRight: 10, height: '100%' }}>
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
					</Col>
				</Row>
			</Content>
		);
	}
}
