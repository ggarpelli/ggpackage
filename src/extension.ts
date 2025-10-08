import * as vscode from 'vscode';
import * as path from 'path';

// Define the structure for our Quick Pick items
interface ComponentQuickPickItem extends vscode.QuickPickItem {
    description: string; // Will contain the metadata type
}

// Maps SFDX folder names to their corresponding metadata types in package.xml
const metadataMap = new Map<string, string>([
    ['applications', 'CustomApplication'], ['appMenus', 'AppMenu'], ['approvalProcesses', 'ApprovalProcess'],
    ['assignmentRules', 'AssignmentRules'], ['aura', 'AuraDefinitionBundle'], ['authproviders', 'AuthProvider'],
    ['autoResponseRules', 'AutoResponseRules'], ['bots', 'Bot'], ['brandingSets', 'BrandingSet'],
    ['callCenters', 'CallCenter'], ['campaignInfluenceModels', 'CampaignInfluenceModel'],
    ['certs', 'Certificate'], ['channels', 'CustomChannel'], ['channelLayouts', 'ChannelLayout'],
    ['chatterExtensions', 'ChatterExtension'], ['classes', 'ApexClass'], ['communities', 'Community'],
    ['components', 'ApexComponent'], ['connectedApps', 'ConnectedApp'], ['contentassets', 'ContentAsset'],
    ['corsWhitelistOrigins', 'CorsWhitelistOrigin'], ['customApplicationComponents', 'CustomApplicationComponent'],
    ['customMetadata', 'CustomMetadata'], ['customPermissions', 'CustomPermission'], ['dashboards', 'Dashboard'],
    ['dataSources', 'ExternalDataSource'], ['delegateGroups', 'DelegateGroup'], ['documents', 'Document'],
    ['duplicateRules', 'DuplicateRule'], ['email', 'EmailTemplate'], ['escalationRules', 'EscalationRules'],
    ['eventSubscriptions', 'EventSubscription'], ['experiences', 'ExperienceBundle'], ['flexipages', 'FlexiPage'],
    ['flows', 'Flow'], ['flowCategories', 'FlowCategory'], ['flowDefinitions', 'FlowDefinition'],
    ['globalValueSets', 'GlobalValueSet'], ['groups', 'Group'], ['homePageComponents', 'HomePageComponent'],
    ['homePageLayouts', 'HomePageLayout'], ['labels', 'CustomLabels'], ['layouts', 'Layout'],
    ['letterhead', 'Letterhead'], ['lwc', 'LightningComponentBundle'], ['managedTopics', 'ManagedTopics'],
    ['matchingRules', 'MatchingRule'], ['messageChannels', 'LightningMessageChannel'], ['milestoneTypes', 'MilestoneType'],
    ['namedCredentials', 'NamedCredential'], ['networks', 'Network'], ['notificationtypes', 'CustomNotificationType'],
    ['objects', 'CustomObject'], ['objectTranslations', 'CustomObjectTranslation'], ['pages', 'ApexPage'],
    ['permissionsets', 'PermissionSet'], ['platformCachePartitions', 'PlatformCachePartition'],
    ['platformEventChannels', 'PlatformEventChannel'], ['postTemplates', 'PostTemplate'], ['profiles', 'Profile'],
    ['queues', 'Queue'], ['quickActions', 'QuickAction'], ['redirectWhitelistUrls', 'RedirectWhitelistUrl'],
    ['remoteSiteSettings', 'RemoteSiteSetting'], ['reports', 'Report'], ['reportTypes', 'ReportType'],
    ['roles', 'Role'], ['rules', 'Rule'], ['samlssoconfigs', 'SamlSsoConfig'], ['scontrols', 'Scontrol'],
    ['sharingRules', 'SharingRules'], ['sharingSets', 'SharingSet'], ['siteDotComSites', 'SiteDotCom'],
    ['sites', 'CustomSite'], ['staticresources', 'StaticResource'], ['tabs', 'CustomTab'],
    ['territory2Models', 'Territory2Model'], ['territory2Rules', 'Territory2Rule'], ['territory2Types', 'Territory2Type'],
    ['topicsForObjects', 'TopicsForObjects'], ['transactionSecurityPolicies', 'TransactionSecurityPolicy'],
    ['translations', 'Translations'], ['triggers', 'ApexTrigger'], ['wave', 'WaveApplication'],
    ['workflows', 'Workflow'], ['xmd', 'WaveXmd']
]);

// Helper maps to identify subcomponents and loose files
const objectSubtypeMap = new Map<string, string>([
    ['fields', 'CustomField'], ['validationRules', 'ValidationRule'], ['listViews', 'ListView'],
    ['recordTypes', 'RecordType'], ['webLinks', 'WebLink'], ['fieldSets', 'FieldSet'],
    ['businessProcesses', 'BusinessProcess'], ['compactLayouts', 'CompactLayout'], ['sharingReasons', 'SharingReason'],
    ['indexes', 'Index']
]);

const extensionMap = new Map<string, string>([
    ['.cls', 'ApexClass'], ['.trigger', 'ApexTrigger'], ['.page', 'ApexPage'],
    ['.component', 'ApexComponent'], ['.app', 'CustomApplication'], ['.object-meta.xml', 'CustomObject'],
    ['.layout-meta.xml', 'Layout'], ['.profile-meta.xml', 'Profile'], ['.permissionset-meta.xml', 'PermissionSet'],
    ['.resource-meta.xml', 'StaticResource'], ['.tab-meta.xml', 'CustomTab'], ['.flexipage-meta.xml', 'FlexiPage']
]);

// More robust function (inspired by "gitgg") to extract all selected URIs from command arguments.
function getUrisFromArgs(...args: any[]): vscode.Uri[] {
    // Searches through all arguments to find an array of selectable items.
    // This is more robust against VS Code API inconsistencies.
    for (const arg of args) {
        if (Array.isArray(arg) && arg.length > 0) {
            // Check if it's an array of URIs (from the Explorer)
            if (arg[0] instanceof vscode.Uri) {
                return arg as vscode.Uri[];
            }
            // Check if it's an array of Resource States from SCM
            if (arg[0]?.resourceUri) {
                return arg.map((item: { resourceUri: vscode.Uri; }) => item.resourceUri);
            }
        }
    }

    // If no array was found, fall back to a single item selection.
    // This is usually the first argument.
    const singleItem = args[0];
    if (singleItem) {
        if (singleItem instanceof vscode.Uri) {
            return [singleItem]; // Single selection from Explorer
        }
        if (singleItem.resourceUri) {
            return [singleItem.resourceUri]; // Single selection from SCM
        }
    }

    return [];
}


// Extracts metadata information from a file URI
function getComponentInfoFromUri(uri: vscode.Uri): { metadataType: string; componentName: string } | undefined {
    const filePath = uri.fsPath;
    let componentName: string | undefined;
    let metadataType: string | undefined;
    const pathParts = filePath.split(path.sep).filter(p => p);

    // Handles object metadata (CustomObject and its children)
    const objectsIndex = pathParts.lastIndexOf('objects');
    if (objectsIndex !== -1 && objectsIndex < pathParts.length - 1) {
        const objectFolderIndex = objectsIndex + 1;
        const objectName = pathParts[objectFolderIndex];
        const remainingParts = pathParts.slice(objectFolderIndex + 1);

        if (remainingParts.length === 1 && remainingParts[0].startsWith(objectName) && remainingParts[0].endsWith('.object-meta.xml')) {
            metadataType = 'CustomObject';
            componentName = objectName;
        } else if (remainingParts.length >= 2) {
            const subtypeFolder = remainingParts[0];
            const fileName = remainingParts[1];
            metadataType = objectSubtypeMap.get(subtypeFolder);
            if (metadataType) {
                componentName = `${objectName}.${fileName.split('.')[0]}`;
            }
        }
    }

    // Handles other metadata types based on the folder structure
    if (!metadataType) {
        for (let i = pathParts.length - 2; i >= 0; i--) {
            const potentialTypeFolder = pathParts[i];
            const potentialMetadataType = metadataMap.get(potentialTypeFolder);
            if (potentialMetadataType) {
                metadataType = potentialMetadataType;
                // For bundles, the component name is the parent folder of the file
                if (['LightningComponentBundle', 'AuraDefinitionBundle', 'ExperienceBundle'].includes(metadataType)) {
                    componentName = pathParts[i + 1];
                } else {
                    // For others, it's the filename without the extension
                    componentName = path.basename(filePath).split('.')[0];
                }
                break;
            }
        }
    }

    // Fallback for loose files based on extension
    if (!metadataType) {
        for (const [extension, type] of extensionMap.entries()) {
            if (filePath.endsWith(extension)) {
                metadataType = type;
                componentName = path.basename(filePath).replace(extension, '');
                break;
            }
        }
    }
    
    if (metadataType && componentName) {
        return { metadataType, componentName };
    }
    return undefined;
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('sfdx-power-tools.generatePackage', async (...args: any[]) => {
        try {
            const contextUris = getUrisFromArgs(...args);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "ggpackage: Searching for components...",
                cancellable: false
            }, async (progress) => {

                const allFiles = await vscode.workspace.findFiles('**/*', '{**/node_modules/**,**/.git/**,**/manifest/**,**/.vscode/**,**/.sfdx/**}');
                const componentMap = new Map<string, Set<string>>();
                
                for (const file of allFiles) {
                    const info = getComponentInfoFromUri(file);
                    if (info) {
                        if (!componentMap.has(info.metadataType)) {
                            componentMap.set(info.metadataType, new Set());
                        }
                        componentMap.get(info.metadataType)?.add(info.componentName);
                    }
                }

                if (componentMap.size === 0) {
                    vscode.window.showInformationMessage('No Salesforce metadata components found in the workspace.');
                    return;
                }

                const quickPickItems: ComponentQuickPickItem[] = [];
                const sortedTypes = Array.from(componentMap.keys()).sort();
                for (const type of sortedTypes) {
                    const members = Array.from(componentMap.get(type)!).sort();
                    for (const member of members) {
                        quickPickItems.push({ label: `${member}`, description: type });
                    }
                }
                
                if (contextUris.length > 0) {
                    const selectedComponentsInfo = new Set<string>();
                    // Expand directories to individual files for pre-selection
                    const expandedUris = [];
                    for (const uri of contextUris) {
                        try {
                            const stat = await vscode.workspace.fs.stat(uri);
                            if (stat.type === vscode.FileType.Directory) {
                                const filesInDir = await vscode.workspace.findFiles(new vscode.RelativePattern(uri, '**/*'));
                                expandedUris.push(...filesInDir);
                            } else {
                                expandedUris.push(uri);
                            }
                        } catch (error) {
                            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                                // If a file is deleted (e.g., in git changes), stat() will fail.
                                // In this case, we still want to process it.
                                expandedUris.push(uri);
                            } else {
                                console.warn(`[ggpackage] Could not get file stat for ${uri.fsPath}. Ignoring.`, error);
                            }
                        }
                    }

                    for (const uri of expandedUris) {
                        const info = getComponentInfoFromUri(uri);
                        if (info) {
                            selectedComponentsInfo.add(`${info.metadataType}::${info.componentName}`);
                        }
                    }
                    // Sets the 'picked' property on items to pre-select them
                    quickPickItems.forEach(item => {
                        if (selectedComponentsInfo.has(`${item.description}::${item.label.trim()}`)) {
                            item.picked = true;
                        }
                    });
                }
                
                // Explicitly define the return type to fix type inference issues
                const selectedItems = await vscode.window.showQuickPick<ComponentQuickPickItem>(quickPickItems, {
                    canPickMany: true,
                    matchOnDescription: true,
                    placeHolder: 'Search by name or metadata type'
                });

                if (!selectedItems || selectedItems.length === 0) { return; }

                const finalPackageMap = new Map<string, Set<string>>();
                for (const item of selectedItems) {
                    const type = item.description;
                    if (!finalPackageMap.has(type)) {
                        finalPackageMap.set(type, new Set<string>());
                    }
                    finalPackageMap.get(type)?.add(item.label.trim());
                }

                if (finalPackageMap.size === 0) { return; }

                let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
                const finalSortedTypes = Array.from(finalPackageMap.keys()).sort();
                finalSortedTypes.forEach(type => {
                    const membersSet = finalPackageMap.get(type);
                    if (membersSet && membersSet.size > 0) {
                        const members = Array.from(membersSet).sort();
                        xmlString += '    <types>\n';
                        members.forEach(member => {
                            xmlString += `        <members>${member}</members>\n`;
                        });
                        xmlString += `        <name>${type}</name>\n`;
                        xmlString += '    </types>\n';
                    }
                });
                xmlString += '    <version>61.0</version>\n</Package>';

                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders) {
                    const rootPath = workspaceFolders[0].uri;
                    const manifestPath = vscode.Uri.joinPath(rootPath, 'manifest');
                    const packageXmlPath = vscode.Uri.joinPath(manifestPath, 'package.xml');
                    try {
                        await vscode.workspace.fs.createDirectory(manifestPath);
                    } catch (dirError) { /* Directory already exists */ }
                    await vscode.workspace.fs.writeFile(packageXmlPath, Buffer.from(xmlString, 'utf8'));
                    const document = await vscode.workspace.openTextDocument(packageXmlPath);
                    await vscode.window.showTextDocument(document);
                }
            });
        } catch (error) {
            console.error('[ggpackage] An unexpected error occurred:', error);
            vscode.window.showErrorMessage('An unexpected error occurred. Please check the Debug Console.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}