/*
switch (modalType) {
	case ModalType.NONE:
		return null;
	case ModalType.VALIDATING: {
		return null;
		let progressPercent = 0;
		let currentMod: Mod | undefined;
		if (!activeCollection?.mods) {
			progressPercent = 100;
		} else {
			const currentlyValidatedMods = validatedMods || 0;
			progressPercent = Math.round((100 * currentlyValidatedMods) / activeCollection.mods.length);
			if (progressPercent < 100) {
				const collectionMods = [...activeCollection.mods];
				currentMod = mods?.get(collectionMods[currentlyValidatedMods]);
			}
		}
		let status: 'active' | 'exception' | 'success' = 'active';
		if (modErrors) {
			status = 'exception';
		} else if (progressPercent >= 100) {
			status = 'success';
		}
		return (
			<Modal title={`Validating Mod Collection ${activeCollection ? activeCollection!.name : 'default'}`} visible closable={false} footer={null}>
				<div>
					<Space
						direction="vertical"
						size="large"
						style={{
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							flexDirection: 'column'
						}}
					>
						<Progress type="circle" percent={progressPercent} status={status} />
						{currentMod ? (
							<p>Validating mod {currentMod.config?.name ? currentMod.config!.name : currentMod.ID}</p>
						) : progressPercent >= 100 ? (
							<p>Validation complete!</p>
						) : null}
					</Space>
				</div>
			</Modal>
		);
	}
	case ModalType.REMOVE_INVALID: {
		const badMods: string[] = [];
		Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
			const isThisError = errors.filter((error: ModError) => error.errorType === ModErrorType.INVALID_ID).length > 0;
			if (isThisError) {
				badMods.push(mod);
			}
		});
		return (
			<Modal
				title="Invalid Mods Found"
				visible
				closable={false}
				footer={[
					<Button
						key="auto-fix"
						danger
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							const currentMods: Set<string> = new Set(activeCollection!.mods);
							badMods.forEach((mod: string) => {
								delete modErrors![mod];
								currentMods.delete(mod);
							});
							activeCollection!.mods = [...currentMods].sort();
							this.setState({ invalidIdsFound: false, madeEdits: true }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Remove
					</Button>,
					<Button
						key="cancel"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.setState({ invalidIdsFound: false }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Keep
					</Button>
				]}
			>
				<p>
					One or more mods are marked as invalid. This means that we are unable to locate the mods either locally, or on the workshop.
				</p>
				<p>Do you want to remove them from the collection?</p>
				<table key="invalid_mods">
					<thead>
						<tr>
							<td>Invalid Mods:</td>
						</tr>
					</thead>
					<tbody>
						{badMods.map((modUID: string) => {
							return (
								<tr key={modUID}>
									<td>{modUID}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				<p>
					NOTE: Invalid local mods will do nothing, but invalid workshop mods will still be loaded by 0ModManager, even though you
					haven&apos;t subscribed to them.
				</p>
			</Modal>
		);
	}
	case ModalType.SUBSCRIBE_DEPENDENCIES: {
		const badMods: Set<string> = new Set();
		const missingDependencies: Set<ModDescriptor> = new Set();
		Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
			const thisError = errors.filter((error: ModError) => error.errorType === ModErrorType.MISSING_DEPENDENCY);
			if (thisError.length > 0) {
				thisError[0].missingDependencies!.forEach((missingDependency: ModDescriptor) => {
					missingDependencies.add(missingDependency);
					badMods.add(mod);
				});
			}
		});
		return (
			<Modal
				title="Missing Dependencies Detected"
				visible
				closable={false}
				footer={[
					<Button
						key="auto-fix"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							const missingDependencyUIDs = [...missingDependencies].map((badDependency: ModDescriptor) => {
								let foundDependency = false;
								let dependencyWorkshopID = badDependency;
								workshopToModID.forEach((modID: string, workshopID: bigint) => {
									let parsedDependency = null;
									try {
										parsedDependency = BigInt(badDependency);
									} catch (e) {
										// we failed to parse - means we know the mod ID
									}
									if (!foundDependency && (badDependency === modID || parsedDependency === workshopID)) {
										foundDependency = true;
										dependencyWorkshopID = workshopID.toString();
									}
								});
								return `workshop:${dependencyWorkshopID}`;
							});

							const currentMods: Set<string> = new Set(activeCollection!.mods);
							missingDependencyUIDs.forEach((modUID: string) => {
								currentMods.add(modUID);
							});
							badMods.forEach((modUID: string) => {
								let errors: ModError[] = modErrors![modUID];
								errors = errors.filter((error: ModError) => error.errorType !== ModErrorType.MISSING_DEPENDENCY);
								const modData = mods.getByUID(modUID);
								if (errors.length > 0) {
									modErrors![modUID] = errors;
									modData!.errors = errors;
								} else {
									delete modErrors![modUID];
									modData!.errors = undefined;
								}
							});
							activeCollection!.mods = [...currentMods].sort();
							this.setState({ missingDependenciesFound: false, madeEdits: true }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Add dependencies
					</Button>,
					<Button
						key="ignore"
						type="primary"
						danger
						disabled={launchGameWithErrors}
						onClick={() => {
							this.setState({ missingDependenciesFound: false }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Ignore dependencies
					</Button>
				]}
			>
				<p>
					One or more mods are missing their dependencies. There is a high chance the game will break if they are not subscribed to.
				</p>
				<p>Do you want to continue anyway?</p>
				<table key="missing_items">
					<thead>
						<tr>
							<td>Missing Dependencies:</td>
						</tr>
					</thead>
					<tbody>
						{[...missingDependencies].map((descriptor: ModDescriptor) => {
							let shownText = '';
							if (descriptor.modID) {
								if (descriptor.workshopID) {
									shownText = `${descriptor.modID} (${descriptor.workshopID})`;
								} else {
									shownText = descriptor.modID;
								}
							} else {
								// we assume workshopID is present
								const modData = mods.getByWorkshopID(descriptor.workshopID!);
								if (modData) {
									shownText = `${modData.id} (${descriptor.workshopID})`;
								} else {
									shownText = `UNKNOWN MOD (${descriptor.workshopID})`;
								}
							}
							return (
								<tr key={descriptor.modID ? descriptor.modID : descriptor.workshopID!.toString()}>
									<td>{shownText}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</Modal>
		);
	}
	case ModalType.SUBSCRIBE_REMOTE: {
		const badMods: string[] = [];
		Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
			const isThisError = errors.filter((error: ModError) => error.errorType === ModErrorType.NOT_SUBSCRIBED).length > 0;
			if (isThisError) {
				badMods.push(mod);
			}
		});
		return (
			<Modal
				title="Unsubscribed Mods Detected"
				visible
				closable={false}
				footer={[
					<Button
						key="auto-fix"
						danger
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							const currentMods: Set<string> = new Set(activeCollection!.mods);
							badMods.forEach((modUID: string) => {
								let errors: ModError[] = modErrors![modUID];
								errors = errors.filter((error: ModError) => error.errorType !== ModErrorType.NOT_SUBSCRIBED);
								const modData = mods.getByUID(modUID);
								if (errors.length > 0) {
									modErrors![modUID] = errors;
									modData!.errors = errors;
								} else {
									delete modErrors![modUID];
									modData!.errors = undefined;
								}
								currentMods.delete(modUID);
							});
							activeCollection!.mods = [...currentMods].sort();
							this.setState({ missingSubscriptions: false, madeEdits: true }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Remove
					</Button>,
					<Button
						key="cancel"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.setState({ missingSubscriptions: false }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Keep
					</Button>
				]}
			>
				<p>
					One or more mods are selected that you are not subscribed to. Steam may not update them properly unless you subscribe to them.
				</p>
				<p>Do you want to keep them in your collection?</p>
				<table key="unsubscribed_items">
					<thead>
						<tr>
							<td>Unsubscribed Mods:</td>
						</tr>
					</thead>
					<tbody>
						{badMods.map((modUID: string) => {
							let modString = modUID;
							const modData = mods.getByUID(modUID);
							if (modData) {
								modString = `(${modData.id}) ${modData.name}`;
							}
							return (
								<tr key={modUID}>
									<td>{modString}</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				<p>NOTE: If they are kept in your collection, they will still appear in-game, even though you have not subscribed to them.</p>
			</Modal>
		);
	}
	case ModalType.INCOMPATIBLE_MOD: {
		const badMods: string[] = [];
		const incompatibilities: { [modUID: string]: string[] } = {};
		Object.entries(modErrors!).forEach(([mod, errors]: [string, ModError[]]) => {
			const thisError = errors.filter((error: ModError) => error.errorType === ModErrorType.INCOMPATIBLE_MODS);
			if (thisError.length > 0) {
				badMods.push(mod);
				incompatibilities[mod] = thisError[0].incompatibleMods!;
			}
		});
		const incompatibilityGroups: string[][] = getIncompatibilityGroups(incompatibilities);
		let allValid = true;
		const groupProps: { values: string[]; valid: boolean; currentSelected: string[] }[] = [];
		incompatibilityGroups.forEach((group: string[]) => {
			const currentSelected = group.filter((modUID: string) => activeCollection!.mods.includes(modUID));
			const groupValid = currentSelected.length <= 1;
			if (!groupValid) {
				allValid = false;
			}
			groupProps.push({ values: group, currentSelected, valid: groupValid });
		});
		return (
			<Modal
				title="Incompatible Mods Detected"
				visible
				closable={false}
				footer={[
					<Button
						key="cancel"
						danger={!allValid}
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.setState({ incompatibleModsFound: false }, this.checkNextErrorModal);
							updateState({ launchingGame: false });
						}}
					>
						Accept Changes
					</Button>
				]}
			>
				<p>You have selected several mods which are incompatible with each other.</p>
				<p>Modify your selected mods here and decide which ones to keep.</p>
				{groupProps.map((group: { values: string[]; valid: boolean; currentSelected: string[] }) => {
					const { values, currentSelected } = group;
					return (
						<Checkbox.Group
							options={values.map((modUID: string) => {
								const modData = mods.getByUID(modUID);
								return {
									value: modUID,
									label: `${modData!.name} (${modUID})`
								};
							})}
							value={currentSelected}
							onChange={(checkedValue: any) => {
								console.log(checkedValue);
							}}
						/>
					);
				})}
			</Modal>
		);
	}
	case ModalType.ERRORS_FOUND:
		return (
			<Modal
				title="Errors Found in Configuration"
				visible
				closable={false}
				footer={[
					<Button
						key="cancel"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.setState({
								modalType: ModalType.NONE,
								invalidIdsFound: false,
								incompatibleModsFound: false,
								missingDependenciesFound: false,
								missingSubscriptions: false
							});
							updateState({ launchingGame: false });
						}}
					>
						Manually Fix
					</Button>,
					<Button
						key="auto-fix"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.checkNextErrorModal();
							updateState({ launchingGame: false });
						}}
					>
						Guided Fix
					</Button>,
					<Button
						key="launch"
						danger
						type="primary"
						disabled={launchGameWithErrors}
						loading={launchGameWithErrors}
						onClick={launchAnyway}
					>
						Launch Anyway
					</Button>
				]}
			>
				<p>One or more mods have either missing dependencies, or is selected alongside incompatible mods.</p>
				<p>Launching the game with this mod list may lead to crashes, or even save game corruption.</p>
				<p>
					Mods that share the same Mod ID (Not the same as Workshop ID) are explicitly incompatible, and only the first one TerraTech
					loads will be used. All others will be ignored.
				</p>

				<p>Do you want to continue anyway?</p>
			</Modal>
		);
	case ModalType.WARNINGS_FOUND:
		return (
			<Modal
				title="Minor Errors Found in Configuration"
				visible
				closable={false}
				footer={[
					<Button
						key="cancel"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.setState({
								modalType: ModalType.NONE,
								invalidIdsFound: false,
								incompatibleModsFound: false,
								missingDependenciesFound: false,
								missingSubscriptions: false
							});
							updateState({ launchingGame: false });
						}}
					>
						Manually Fix
					</Button>,
					<Button
						key="auto-fix"
						type="primary"
						disabled={launchGameWithErrors}
						onClick={() => {
							this.checkNextErrorModal();
							updateState({ launchingGame: false });
						}}
					>
						Guided Fix
					</Button>,
					<Button
						key="launch"
						danger
						type="primary"
						disabled={launchGameWithErrors}
						loading={launchGameWithErrors}
						onClick={launchAnyway}
					>
						Launch Anyway
					</Button>
				]}
			>
				<p>Unable to validate one or more mods in the collection.</p>
				<p>This is probably because you are not subscribed to them.</p>
				<p>Do you want to continue anyway?</p>
			</Modal>
		);
	default:
		return null;
}
*/
