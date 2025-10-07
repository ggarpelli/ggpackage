import * as vscode from 'vscode';
import * as path from 'path';

// ... (TODOS OS SEUS MAPAS E FUNÇÕES CONTINUAM AQUI, SEM MUDANÇAS)
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

const objectSubtypeMap = new Map<string, string>([
    ['fields', 'CustomField'], ['validationRules', 'ValidationRule'], ['listViews', 'ListView'],
    ['recordTypes', 'RecordType'], ['webLinks', 'WebLink'], ['fieldSets', 'FieldSet'],
    ['businessProcesses', 'BusinessProcess'], ['compactLayouts', 'CompactLayout'], ['sharingReasons', 'SharingReason'],
    ['indexes', 'Index']
]);


function getUrisFromArgs(...args: any[]): vscode.Uri[] {
    if (args.length === 0) { return []; }
    if (Array.isArray(args[0]) && args[0].length > 0 && args[0][0].resourceUri) {
        return args[0].map((item: { resourceUri: vscode.Uri }) => item.resourceUri);
    }
    if (Array.isArray(args[1]) && args[1].length > 0) {
        return args[1];
    }
    if (args[0] instanceof vscode.Uri) {
        return [args[0]];
    }
    return [];
}

/**
 * Função recursiva para encontrar todos os arquivos dentro de um diretório.
 * @param dirUri URI do diretório a ser lido.
 * @returns Uma Promise com um array de URIs de todos os arquivos encontrados.
 */
async function findFilesInDir(dirUri: vscode.Uri): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    for (const [name, type] of entries) {
        const entryUri = vscode.Uri.joinPath(dirUri, name);
        if (type === vscode.FileType.Directory) {
            files.push(...await findFilesInDir(entryUri));
        } else if (type === vscode.FileType.File) {
            files.push(entryUri);
        }
    }
    return files;
}

/**
 * Expande uma lista de URIs, convertendo quaisquer diretórios em uma lista de todos os arquivos dentro deles.
 * @param uris URIs selecionados pelo usuário.
 * @returns Uma Promise com uma lista plana de URIs contendo apenas arquivos.
 */
async function expandDirectoriesToFiles(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
    const allFileUris: vscode.Uri[] = [];
    for (const uri of uris) {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type === vscode.FileType.Directory) {
                allFileUris.push(...await findFilesInDir(uri));
            } else if (stat.type === vscode.FileType.File) {
                allFileUris.push(uri);
            }
        } catch (error) {
            console.error(`[ggpackage] Erro ao acessar o recurso ${uri.fsPath}:`, error);
        }
    }
    return allFileUris;
}

export function activate(context: vscode.ExtensionContext) {
    
    // COMANDO DE TESTE ADICIONADO AQUI
    let testDisposable = vscode.commands.registerCommand('ggpackage.testMenu', () => {
        vscode.window.showInformationMessage('O MENU DE TESTE APARECEU E FUNCIONOU!');
    });
    context.subscriptions.push(testDisposable);


    // O COMANDO ORIGINAL CONTINUA AQUI
    let disposable = vscode.commands.registerCommand('sfdx-power-tools.generatePackage', async (...args: any[]) => {
        try {
            console.log('Argumentos recebidos pelo comando:', JSON.stringify(args, null, 2));

            const selectedUris = getUrisFromArgs(...args);
            if (selectedUris.length === 0) {
                vscode.window.showInformationMessage('Nenhum arquivo ou pasta selecionado.');
                return;
            }

            const filesToProcess = await expandDirectoriesToFiles(selectedUris);
            const packageMap = new Map<string, string[]>();

            if (filesToProcess.length === 0) {
                vscode.window.showInformationMessage('Nenhum arquivo encontrado na seleção.');
                return;
            }

            for (const file of filesToProcess) {
                try {
                    const filePath = file.fsPath;
                    const pathParts = filePath.split(path.sep);
                    const baseName = path.basename(filePath).split('.')[0];
                    
                    let componentName: string | undefined;
                    let metadataType: string | undefined;

                    const objectsIndex = pathParts.lastIndexOf('objects');
                    // LÓGICA REFINADA PARA OBJETOS E SEUS FILHOS
                    if (objectsIndex !== -1 && objectsIndex < pathParts.length - 1) {
                        const objectFolderIndex = objectsIndex + 1;
                        const objectName = pathParts[objectFolderIndex];
                        const remainingParts = pathParts.slice(objectFolderIndex + 1);

                        // Cenário 1: É o arquivo do objeto principal (ex: .../objects/Account/Account.object-meta.xml)
                        if (remainingParts.length === 1 && remainingParts[0] === `${objectName}.object-meta.xml`) {
                            metadataType = 'CustomObject';
                            componentName = objectName;
                        } 
                        // Cenário 2: É um componente filho (ex: .../objects/Account/fields/MyField.field-meta.xml)
                        else if (remainingParts.length === 2) {
                            const subtypeFolder = remainingParts[0];
                            const fileName = remainingParts[1];
                            metadataType = objectSubtypeMap.get(subtypeFolder);
                            if (metadataType) {
                                componentName = `${objectName}.${fileName.split('.')[0]}`;
                            }
                        }
                    } 
                    // LÓGICA PADRÃO PARA OUTROS METADADOS
                    else { 
                        const parentFolderName = path.basename(path.dirname(filePath));
                        metadataType = metadataMap.get(parentFolderName);

                        if (metadataType) {
                            componentName = baseName;
                            if (filePath.endsWith('.reportFolder-meta.xml')) {
                                metadataType = 'ReportFolder';
                            }
                        }
                    }
                    
                    if (metadataType && componentName) {
                        if (!packageMap.has(metadataType)) {
                            packageMap.set(metadataType, []);
                        }
                        const members = packageMap.get(metadataType);
                        if (members && !members.includes(componentName)) {
                            members.push(componentName);
                        }
                    }
                } catch (e) {
                    console.error(`[ggpackage] Falha ao processar o arquivo ${file.fsPath}:`, e);
                }
            }

            if (packageMap.size === 0) {
                vscode.window.showInformationMessage('Nenhum metadado reconhecido foi selecionado.');
                return;
            }

            // --- Geração e salvamento do XML (sem alterações) ---
            let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
            const sortedTypes = Array.from(packageMap.keys()).sort();
            sortedTypes.forEach(type => {
                const members = packageMap.get(type);
                if (members) {
                    xmlString += '    <types>\n';
                    members.sort().forEach(member => {
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
                await vscode.workspace.fs.createDirectory(manifestPath);
                await vscode.workspace.fs.writeFile(packageXmlPath, Buffer.from(xmlString, 'utf8'));
                const document = await vscode.workspace.openTextDocument(packageXmlPath);
                await vscode.window.showTextDocument(document);
            }
        } catch (error) {
            console.error('[ggpackage] Ocorreu um erro inesperado:', error);
            vscode.window.showErrorMessage('Um erro inesperado ocorreu. Verifique o Console de Depuração.');
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}