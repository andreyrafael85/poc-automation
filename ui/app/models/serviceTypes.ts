import type { StringKey } from '../i18n/strings';

/**
 * Service types as the entity model reports them (`serviceType`), with the words a reader uses
 * for them (3.2.3, Topology). A type this table does not know is shown as reported.
 */
export const SERVICE_TYPE_KEY: Readonly<Record<string, StringKey>> = {
  WEB_REQUEST_SERVICE: 'svctype.webRequest',
  WEB_SERVICE: 'svctype.web',
  DATABASE_SERVICE: 'svctype.database',
  MESSAGING_SERVICE: 'svctype.messaging',
  QUEUE_LISTENER_SERVICE: 'svctype.queueListener',
  CUSTOM_SERVICE: 'svctype.custom',
  REMOTE_CALL_SERVICE: 'svctype.remoteCall',
  RMI_SERVICE: 'svctype.rmi',
  UNIFIED: 'svctype.unified',
};

/** The vendor value the agent sends when it could not tell which database it talks to. */
export const UNDECLARED_VENDOR = '[declared unavailable by agent]';
