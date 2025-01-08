export interface RecentChangeEvent {
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
  id: number; // ID of the recentchange event (rcid)
  type: string; // Type of recentchange event (rc_type)
  namespace: number; // ID of relevant namespace of affected page (rc_namespace, page_namespace)
  title: string; // Full page name, from Title::getPrefixedText
  title_url: string;
  comment: string; // (rc_comment)
  timestamp: number; // Unix timestamp (derived from rc_timestamp)
  user: string; // (rc_user_text)
  bot: boolean; // (rc_bot)
  notify_url: string;
  minor: boolean; // (rc_minor)
  patrolled: boolean; // (rc_patrolled)
  length: {
    old: number | null; // (rc_old_len)
    new: number | null; // (rc_new_len)
  };
  revision: {
    old: number | null; // (rc_this_oldid)
    new: number | null; // (rc_last_oldid)
  };
  server_url: string; // $wgCanonicalServer
  server_name: string; // $wgServerName
  server_script_path: string; // $wgScriptPath
  wiki: string; // wfWikiID ($wgDBprefix, $wgDBname)
  parsedcomment: string; // The rc_comment parsed into simple HTML. Optional
}

export function subscribeToRecentChanges() {
  const url = 'https://stream.wikimedia.org/v2/stream/recentchange';
  const eventSource = new EventSource(url);

  return {
    onMessage: (callback: (event: RecentChangeEvent) => void) => {
      eventSource.onmessage = (message) => {
        const event: RecentChangeEvent = JSON.parse(message.data);
        console.log(event);
        callback(event);
      };
    },
    onError: (callback: (error: Event) => void) => {
      eventSource.onerror = (error) => {
        callback(error);
      };
    },
    close: () => {
      eventSource.close();
    },
  };
}
