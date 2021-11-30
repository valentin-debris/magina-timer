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
interface RxClientDocMethods {
    className(): string;
}

export type RxClientDocument = RxDocument<
    RxClientDocumentType,
    RxClientDocMethods
>;

export type RxClientCollection = RxCollection<
    RxClientDocumentType,
    RxClientDocMethods,
    {}
>;

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
interface RxProjectDocMethods {
    className(): string;
}

export type RxProjectDocument = RxDocument<
    RxProjectDocumentType,
    RxProjectDocMethods
>;

export type RxProjectCollection = RxCollection<
    RxProjectDocumentType,
    RxProjectDocMethods,
    {}
>;

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
    plannedWorkload: number;
    notePublic: string;
    notePrivate: string;
    existRemote: number;
}
// ORM methods
interface RxTaskDocMethods {
    className(): string;
}

export type RxTaskDocument = RxDocument<RxTaskDocumentType, RxTaskDocMethods>;

export type RxTaskCollection = RxCollection<
    RxTaskDocumentType,
    RxTaskDocMethods,
    {}
>;

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
    className(): string;
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
 * ================ SCHEDULE ===============
 */
export interface RxScheduleDocumentType {
    id: string;
    title: string;
    duration: number;
    clientId: string;
    clientId_?: Promise<RxClientDocument>;
    projectId: string;
    projectId_?: Promise<RxProjectDocument>;
    taskId: string;
    taskId_?: Promise<RxTaskDocument>;
}
// ORM methods
interface RxScheduleDocMethods {
    getRelated(): Promise<RxDocument>;
    className(): string;
}
export type RxScheduleDocument = RxDocument<
    RxScheduleDocumentType,
    RxScheduleDocMethods
>;

export type RxScheduleCollection = RxCollection<
    RxScheduleDocumentType,
    RxScheduleDocMethods,
    {}
>;

export interface RxSchedulesCollections {
    schedules: RxScheduleCollection;
}

/**
 * ================ FAVORITE ===============
 */
export interface RxFavoriteDocumentType {
    title: string;
    position: number;
    taskId: string;
    taskId_?: Promise<RxTaskDocument>;
}
// ORM methods
export type RxFavoriteDocument = RxDocument<RxFavoriteDocumentType, {}>;

export type RxFavoriteCollection = RxCollection<RxFavoriteDocumentType, {}, {}>;

export interface RxFavoritesCollections {
    favorites: RxFavoriteCollection;
}

/**
 * ================ HOLIDAY ===============
 */
export interface RxHolidayDocumentType {
    id: string;
    description: string;
    fullname: string;
    dateDebut: number;
    dateFin: number;
    statut: number;
    dolibarrId: string;
    existRemote: number;
    owner: number;
    needInsert: number;
    needUpdate: number;
    needRemove: number;
}

interface RxHolidayDocMethods {
    getDateStart(): string;
    getDateEnd(): string;
    isNow(): boolean;
}
// ORM methods

export type RxHolidayDocument = RxDocument<
    RxHolidayDocumentType,
    RxHolidayDocMethods
>;
export type RxHolidayCollection = RxCollection<
    RxHolidayDocumentType,
    RxHolidayDocMethods,
    {}
>;
export interface RxHolidaysCollections {
    holidays: RxHolidayCollection;
}

/**
 * ================ GLOBAL ===============
 */

export interface RxItemsCollections {
    clients: RxClientCollection;
    projects: RxProjectCollection;
    tasks: RxTaskCollection;
    times: RxTimeCollection;
    schedules: RxScheduleCollection;
    favorites: RxFavoriteCollection;
    holidays: RxHolidayCollection;
}
export type RxItemsDatabase = RxDatabase<RxItemsCollections>;
