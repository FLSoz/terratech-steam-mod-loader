"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateActiveCollection = exports.validateAppConfig = void 0;
const Api_1 = require("renderer/model/Api");
const ModCollection_1 = require("renderer/model/ModCollection");
const Sleep_1 = require("./Sleep");
async function validateAppConfig(config) {
    const errors = {};
    const fields = ['steamExec', 'workshopDir', 'localDir'];
    const paths = ['Steam executable', 'TerraTech Steam Workshop directory', 'TerraTech Local Mods directory'];
    let failed = false;
    await Promise.allSettled(fields.map((field) => {
        return Api_1.api.pathExists(config[field]);
    })).then((results) => {
        results.forEach((result, index) => {
            if (result.status !== 'fulfilled') {
                errors[fields[index]] = `OVERRIDE:Unexpected error checking ${fields[index]} path (${paths[index]})`;
                failed = true;
            }
            else if (!result.value) {
                errors[fields[index]] = `OVERRIDE:Path to ${fields[index]} (${paths[index]}) was invalid`;
                failed = true;
            }
        });
        return failed;
    });
    if (failed) {
        return errors;
    }
    return undefined;
}
exports.validateAppConfig = validateAppConfig;
function validateMod(props, modList, allMods, errors, updateValidatedModsCallback) {
    const mod = props.value;
    const { index } = props;
    if (mod) {
        Api_1.api.logger.info(`validating ${mod}`);
        const modData = allMods.get(mod);
        if (modData) {
            if (modData.config) {
                const dependencies = modData.config.dependsOn;
                if (dependencies) {
                    const missingDependencies = [];
                    dependencies.forEach((dependency) => {
                        if (!modList.includes(dependency)) {
                            missingDependencies.push(dependency);
                        }
                    });
                    if (missingDependencies.length > 0) {
                        errors[mod] = {
                            errorType: ModCollection_1.ModErrorType.MISSING_DEPENDENCY,
                            values: missingDependencies
                        };
                    }
                }
            }
        }
        else {
            errors[mod] = { errorType: ModCollection_1.ModErrorType.INVALID_ID };
        }
    }
    if (updateValidatedModsCallback) {
        updateValidatedModsCallback(index + 1);
    }
}
function validateFunctionAsync(validationProps) {
    const { modList, allMods, updateValidatedModsCallback, setModErrorsCallback } = validationProps;
    const errors = {};
    return new Promise((resolve) => {
        (0, Sleep_1.delayForEach)(modList, 10, validateMod, modList, allMods, errors, updateValidatedModsCallback)
            .then(() => {
            // eslint-disable-next-line promise/always-return
            if (Object.keys(errors).length > 0) {
                if (setModErrorsCallback) {
                    setModErrorsCallback(errors);
                }
                resolve(false);
            }
            resolve(true);
        })
            .catch((error) => {
            Api_1.api.logger.error(error);
            errors.undefined = error.toString();
            if (setModErrorsCallback) {
                setModErrorsCallback(errors);
            }
            resolve(false);
        });
    });
}
function validateActiveCollection(validationProps) {
    const { modList } = validationProps;
    Api_1.api.logger.info('Selected mods:');
    Api_1.api.logger.info(modList);
    const validationPromise = new Promise((resolve, reject) => {
        try {
            validateFunctionAsync(validationProps)
                // eslint-disable-next-line promise/always-return
                .then((isValid) => {
                resolve(isValid);
            })
                .catch((error) => {
                Api_1.api.logger.error(error);
                reject(error);
            });
        }
        catch (error) {
            reject(error);
        }
    });
    return validationPromise
        .then((isValid) => {
        Api_1.api.logger.info('IS VALID:');
        Api_1.api.logger.info(isValid);
        return isValid;
    })
        .catch((error) => {
        Api_1.api.logger.error(error);
        return false;
    });
}
exports.validateActiveCollection = validateActiveCollection;
//# sourceMappingURL=Validation.js.map