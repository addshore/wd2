class Wikibase {

    private apiUrl: string;

    // Cached retrieved data
    private cachedSiteInfo: SiteInfoNamespaces | null = null;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async fetchItemSuggestions(query: string): Promise<{ suggestions: string[], error?: string }> {
        return this.fetchSuggestions(query, 'item');
    }

    async fetchSuggestions(query: string, type: string): Promise<{ suggestions: string[], error?: string }> {
        if (query.length === 0) {
            return { suggestions: [] };
        }
        const url = `${this.apiUrl}?action=wbsearchentities&search=${query}&format=json&errorformat=plaintext&language=en&uselang=en&type=${type}&origin=*`;
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
        const url = `${this.apiUrl}?action=query&meta=siteinfo&siprop=namespaces&format=json&origin=*`;
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
        const url = `${this.apiUrl}?action=query&list=random&rnnamespace=${namespaceId}&rnlimit=1&format=json&origin=*`;
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