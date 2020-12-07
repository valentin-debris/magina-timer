/**
 * custom typings so typescript knows about the schema-fields
 */

import { RxCollection, RxDatabase, RxDocument } from "rxdb";

/**
 * ================ CLIENT ===============
 */
export interface RxClientDocumentType {
  id: string;
  title: string;
  existRemote: number;
}
// ORM methods
// interface RxClientDocMethods {}
export type RxClientDocument = RxDocument<RxClientDocumentType, {}>;

export type RxClientCollection = RxCollection<RxClientDocumentType, {}, {}>;

export interface RxClientsCollections {
  clients: RxClientCollection;
}

/**
 * ================ PROJECT ===============
 */
export interface RxProjectDocumentType {
  id: string;
  title: string;
  clientId: string;
  clientId_: Promise<RxClientDocument>;
  ref: string;
  existRemote: number;
}
// ORM methods
// interface RxProjectDocMethods {}
export type RxProjectDocument = RxDocument<RxProjectDocumentType, {}>;

export type RxProjectCollection = RxCollection<RxProjectDocumentType, {}, {}>;

export interface RxProjectsCollections {
  projects: RxProjectCollection;
}

/**
 * ================ TASK ===============
 */
export interface RxTaskDocumentType {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectId_: Promise<RxProjectDocument>;
  ref: string;
  refPropal: string;
  existRemote: number;
}
// ORM methods
// interface RxTaskDocMethods {}
export type RxTaskDocument = RxDocument<RxTaskDocumentType, {}>;

export type RxTaskCollection = RxCollection<RxTaskDocumentType, {}, {}>;

export interface RxTasksCollections {
  tasks: RxTaskCollection;
}

/**
 * ================ TIME ===============
 */
export interface RxTimeDocumentType {
  id: string;
  title: string;
  start: number;
  duration: string;
  taskId: string;
  taskId_?: Promise<RxTaskDocument>;
  futurTaskId: string;
  isPersonal: number;
  dolibarrId: string;
  existRemote: number;
  isCurrent: number;
  needInsert: number;
  needUpdate: number;
  needRemove: number;
  sortVal?: string;
}
// ORM methods
interface RxTimeDocMethods {
  getFullDate(): string;
  getTimeStart(): string;
  getTimeEnd(): string;
  isSync(): boolean;
}
export type RxTimeDocument = RxDocument<RxTimeDocumentType, RxTimeDocMethods>;

export type RxTimeCollection = RxCollection<
  RxTimeDocumentType,
  RxTimeDocMethods,
  {}
>;

export interface RxTimesCollections {
  times: RxTimeCollection;
}

/**
 * ================ GLOBAL ===============
 */

export interface RxItemsCollections {
  clients: RxClientCollection;
  projects: RxProjectCollection;
  tasks: RxTaskCollection;
  times: RxTimeCollection;
}
export type RxItemsDatabase = RxDatabase<RxItemsCollections>;
