class Wikibase {
    private apiUrl: string;

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

    async randomItem(): Promise<string | undefined> {
        // TODO dynamically get the namespace if for items...
        const url = `${this.apiUrl}?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                return data.query.random[0].title;
            }
        } catch (error) {
            console.error('Error fetching random item:', error);
        }
    }
}

export default Wikibase;