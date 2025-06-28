export async function fetchAvailableStreams(): Promise<string[]> {
    const url = 'https://stream.wikimedia.org/?spec';
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch OpenAPI spec');
        const spec = await response.json();
        const paths = spec.paths || {};
        const streamPath = paths['/v2/stream/{streams}'];
        if (!streamPath || !streamPath.get || !streamPath.get.parameters) throw new Error('Spec format error');
        const streamsParam = (streamPath.get.parameters as unknown[]).find((p): p is { name: string; schema?: { items?: { enum?: string[] } } } => {
            if (typeof p !== 'object' || p === null) return false;
            return (p as { name?: unknown }).name === 'streams';
        });
        if (!streamsParam || !streamsParam.schema || !streamsParam.schema.items || !streamsParam.schema.items.enum) throw new Error('Streams enum not found');
        return streamsParam.schema.items.enum;
    } catch (e) {
        console.log('Failed to fetch streams, defaulting to ["recentchange"]');
        return ['recentchange'];
    }
}
