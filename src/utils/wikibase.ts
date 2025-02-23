import { ApiClient, LabelsApi, ItemsApi } from '@wmde/wikibase-rest-api';

class Wikibase {
    // Base URL of the Wikibase instance
    private baseUrl: string;

    // REST API
    private apiClient: ApiClient;
    private itemsApi: ItemsApi;
    private labelsApi: LabelsApi;

    // Cached retrieved data
    private cachedSiteInfo: SiteInfoNamespaces | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.apiClient = new ApiClient(this.getRestApiUrl('/wikibase'));
        this.itemsApi = new ItemsApi(this.apiClient);
        this.labelsApi = new LabelsApi(this.apiClient);
    }

    private getActionApiUrl(endpoint: string): string {
        return `${this.baseUrl}api.php${endpoint}`;
    }

    private getRestApiUrl(endpoint: string): string {
        return `${this.baseUrl}rest.php${endpoint}`;
    }

    async fetchItemSuggestions(query: string): Promise<{ suggestions: string[], error?: string }> {
        return this.fetchSuggestions(query, 'item');
    }

    async fetchSuggestions(query: string, type: string): Promise<{ suggestions: string[], error?: string }> {
        if (query.length === 0) {
            return { suggestions: [] };
        }
        const url = this.getActionApiUrl(`?action=wbsearchentities&search=${query}&format=json&errorformat=plaintext&language=en&uselang=en&type=${type}&origin=*`);
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return { suggestions: data.search.map((item: { id: string, label: string, description: string }) => `${item.id} - ${item.label} (${item.description})`) };
            } else {
                return { suggestions: [], error: 'Failed to fetch suggestions' };
            }
        } catch (error) {
            return { suggestions: [], error: String(error) };
        }
    }

    async getSiteInfoNamespaces(): Promise<any> {
        if (this.cachedSiteInfo) {
            return this.cachedSiteInfo;
        }
        const url = this.getActionApiUrl(`?action=query&meta=siteinfo&siprop=namespaces&format=json&origin=*`);
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.cachedSiteInfo = data.query;
                console.log('Site info:', this.cachedSiteInfo);
                return this.cachedSiteInfo;
            } else {
                throw new Error('Failed to fetch site info');
            }
        } catch (error) {
            console.error('Error fetching site info:', error);
            throw error;
        }
    }

    async getItemNamespaceId(): Promise<number | undefined> {
        const siteInfoNamespaces = await this.getSiteInfoNamespaces();
        const itemNamespaceId = Object.keys(siteInfoNamespaces.namespaces).find(key => siteInfoNamespaces.namespaces[key].defaultcontentmodel === 'wikibase-item');
        return itemNamespaceId ? Number(itemNamespaceId) : undefined;
    }

    async getPropertyNamespaceId(): Promise<number | undefined> {
        const siteInfo = await this.getSiteInfoNamespaces();
        const propertyNamespaceId = Object.keys(siteInfo.namespaces).find(key => siteInfo.namespaces[key].defaultcontentmodel === 'wikibase-property');
        return propertyNamespaceId ? Number(propertyNamespaceId) : undefined;
    }

    async randomPage(namespaceId: number): Promise<string | undefined> {
        const url = this.getActionApiUrl(`?action=query&list=random&rnnamespace=${namespaceId}&rnlimit=1&format=json&origin=*`);
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return data.query.random[0].title;
            }
        } catch (error) {
            console.error('Error fetching random page:', error);
        }
    }

    async randomItem(): Promise<string | undefined> {
        const itemNamespaceId = await this.getItemNamespaceId();
        if (itemNamespaceId !== undefined) {
            return this.randomPage(itemNamespaceId);
        }
    }

    async loadItemData(item: string): Promise<Item> {
        const json = await this.itemsApi.getItem(item);

        // Update terms
        const terms = Object.keys({ ...json.labels, ...json.descriptions }).map(lang => ({
            language: lang,
            label: json.labels[lang],
            description: json.descriptions[lang] || '',
            aliases: (json.aliases[lang] || []).join(', ')
        }));

        // Update sitelinks
        const sitelinks = Object.entries(json.sitelinks || {}).map(([site, sitelink]) => ({
            site,
            title: sitelink.title,
            url: sitelink.url,
            badges: sitelink.badges.map(badge => this.getBadgeLabel(badge)).join(', ')
        }));

        // Fetch badge labels
        const badges = new Set<string>();
        for (const sitelink of Object.values(json.sitelinks || {})) {
            for (const badge of sitelink.badges) {
                badges.add(badge);
            }
        }
        for (const badge of badges) {
            const label = await this.fetchItemLabel(badge);
            if (label) {
                this.badgeLabels.set(badge, label);
            }
        }

        // Update statements
        const statements = json.statements || [];

        return { terms, sitelinks, statements };
    }

    private badgeLabels = new Map<string, string>();

    async fetchItemLabel(qNumber: string): Promise<string | undefined> {
        try {
            return await this.labelsApi.getItemLabelWithFallback(qNumber, 'en');
        } catch {
            return undefined;
        }
    }

    private getBadgeLabel(badge: string): string {
        return this.badgeLabels.get(badge) || badge;
    }
}

export default Wikibase;

interface SiteInfoNamespaces {
    namespaces: { [key: string]: Namespace };
}

interface Namespace {
    id: number;
    case: string;
    content?: string;
    defaultcontentmodel?: string;
    subpages?: string;
    canonical?: string;
    namespaceprotection?: string;
    "*": string;
}

interface Item {
    terms: Term[];
    sitelinks: Sitelink[];
    statements: any[];
}

interface Term {
    language: string;
    label: string;
    description: string;
    aliases: string;
}

interface Sitelink {
    site: string;
    title: string;
    url: string;
    badges: string;
}