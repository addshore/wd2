export interface EventStreamEvent {
  $schema: string;
  meta: {
    uri: string;
    request_id: string;
    id: string;
    dt: string;
    domain: string;
    stream: string;
    topic: string;
    partition: number;
    offset: number;
  };
  id: number;
  type: string;
  namespace: number;
  title: string;
  title_url: string;
  comment: string;
  timestamp: number;
  user: string;
  bot: boolean;
  notify_url: string;
  minor: boolean;
  patrolled: boolean;
  length: {
    old: number | null;
    new: number | null;
  };
  revision: {
    old: number | null;
    new: number | null;
  };
  server_url: string;
  server_name: string;
  server_script_path: string;
  wiki: string;
  parsedcomment: string;
}

export function subscribeToEventStream(streamName: string = 'recentchange') {
    const url = `https://stream.wikimedia.org/v2/stream/${streamName}`;
    let eventSource: EventSource | null = null;
    let retryDelay = 1000;
    const maxRetryDelay = 10000;

    const connect = () => {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
            retryDelay = 1000;
        };

        eventSource.onerror = () => {
            if (eventSource) {
                eventSource.close();
            }
            setTimeout(connect, retryDelay);
            retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
        };
    };

    connect();

    return {
        onMessage: (callback: (event: any) => void) => {
            if (eventSource) {
                eventSource.onmessage = (message) => {
                    let event: any;
                    try {
                        event = JSON.parse(message.data);
                    } catch (e) {
                        event = message.data;
                    }
                    callback(event);
                };
            }
        },
        onError: (callback: (error: Event) => void) => {
            if (eventSource) {
                eventSource.onerror = (error) => {
                    callback(error);
                };
            }
        },
        close: () => {
            if (eventSource) {
                eventSource.close();
            }
        },
    };
}
