import * as PouchdbAdapterHttp from "pouchdb-adapter-http";
import * as PouchdbAdapterIdb from "pouchdb-adapter-idb";

import {
    RxItemsCollections,
    RxItemsDatabase,
    RxTimeDocument,
    RxTimeDocumentType,
} from "@/RxDB";
import { addRxPlugin, createRxDatabase } from "rxdb/plugins/core";

import DateConv from "@/plugins/dateConv";
import Dolibarr from "@/plugins/dolibarr";
import Config from "@/plugins/electronStore";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBLeaderElectionPlugin } from "rxdb/plugins/leader-election";
import { RxDBMigrationPlugin } from "rxdb/plugins/migration";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBReplicationPlugin } from "rxdb/plugins/replication";
import { RxDBValidatePlugin } from "rxdb/plugins/validate";
import clientSchema from "@/schemas/Client.schema";
import personalSchema from "@/schemas/Personal.schema";
import projectSchema from "@/schemas/Project.schema";
import taskSchema from "@/schemas/Task.schema";
import timeSchema from "@/schemas/Time.schema";
import { v4 as uuidv4 } from "uuid";

const isDev = process.env.NODE_ENV !== "production";

if (process.env.NODE_ENV === "development") {
    // in dev-mode we add the dev-mode plugin
    // which does many checks and adds full error messages
    addRxPlugin(RxDBDevModePlugin);
}

addRxPlugin(RxDBValidatePlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBReplicationPlugin);
// always needed for replication with the node-server
addRxPlugin(PouchdbAdapterHttp);
addRxPlugin(PouchdbAdapterIdb);
const useAdapter = "idb";

addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

const collections = [
    {
        name: "clients",
        schema: clientSchema,
    },
    {
        name: "projects",
        schema: projectSchema,
    },
    {
        name: "tasks",
        schema: taskSchema,
    },
    {
        name: "personals",
        schema: personalSchema,
        sync: true,
    },
];

const syncURL = "http://" + window.location.hostname + ":10101/";

/**
 * creates the database
 */
async function _create(): Promise<RxItemsDatabase> {
    const nameDB = "magina_timer" + process.env.VUE_APP_DB_SUFFIX;

    if (nameDB != Config.get("dbName")) {
        Config.set("dbName", nameDB);
        Config.reset("lastCalls");
    }

    const db = await createRxDatabase<RxItemsCollections>({
        name: nameDB,
        adapter: useAdapter,
    });
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (window as any).db = db; // write to window for debugging

    // show leadership in title
    // db.waitForLeadership().then(() => {
    //     console.log("isLeader now");
    //     document.title = "♛ " + document.title;
    // });

    // create collections
    await Promise.all(collections.map((colData) => db.collection(colData)));

    await db.collection({
        name: "times",
        schema: timeSchema,
        migrationStrategies: {
            //transforms data from version 0 to version 1
            1: function(oldDoc: RxTimeDocument) {
                //@ts-ignore
                oldDoc.personalTaskId = "";
                return oldDoc;
            },
            2: function(oldDoc: RxTimeDocument) {
                //@ts-ignore
                delete oldDoc.personalTaskId;
                oldDoc.isPersonal = 0;
                return oldDoc;
            },
        },
        methods: {
            //Output : 2020-02-10
            getFullDate(this: RxTimeDocument): string {
                const d = new Date(this.start * 1000),
                    year = d.getUTCFullYear();
                let month = "" + (d.getUTCMonth() + 1),
                    day = "" + d.getUTCDate();

                if (month.length < 2) month = "0" + month;
                if (day.length < 2) day = "0" + day;

                return [year, month, day].join("-");
            },

            //Output : 18:09
            getTimeStart(this: RxTimeDocument): string {
                const d = new Date(this.start * 1000);
                let hour = "" + d.getUTCHours(),
                    minute = "" + d.getMinutes();

                if (hour.length < 2) hour = "0" + hour;
                if (minute.length < 2) minute = "0" + minute;

                return [hour, minute].join(":");
            },

            //Output : 18:32 or ""
            getTimeEnd(this: RxTimeDocument): string {
                if (this.duration == "") return "";

                const end = this.start + parseInt(this.duration, 10);
                const d = new Date(end * 1000);
                let hour = "" + d.getUTCHours(),
                    minute = "" + d.getMinutes();

                if (hour.length < 2) hour = "0" + hour;
                if (minute.length < 2) minute = "0" + minute;

                return [hour, minute].join(":");
            },

            isSync(this: RxTimeDocument): boolean {
                return (
                    this.needInsert == 0 &&
                    this.needUpdate == 0 &&
                    this.needRemove == 0 &&
                    this.dolibarrId != ""
                );
            },
        },
    });

    // hooks
    db.collections.times.preInsert((docObj: RxTimeDocumentType) => {
        docObj.id = uuidv4();
    }, true);

    // sync with server
    db.times.sync({
        remote: syncURL + "/times",
        direction: {
            pull: true,
            push: true,
        },
    });

    return db;
}

function _getNewTimeObj(base?: RxTimeDocument) {
    const obj = {
        id: "",
        start: DateConv.timeUTC(),
        title: base ? base.title : "",
        duration: "0",
        taskId: base ? base.taskId : "",
        futurTaskId: "",
        isPersonal: base ? base.isPersonal : 0,
        dolibarrId: "",
        needInsert: 0,
        needUpdate: 0,
        needRemove: 0,
        isCurrent: 0,
        existRemote: 0,
    };
    return obj;
}

const DatabaseService = {
    DB_CREATE_PROMISE: _create(),
    get(): Promise<RxItemsDatabase> {
        return this.DB_CREATE_PROMISE;
    },
    getRandomId(): string {
        return uuidv4();
    },
    getNewTimeObj() {
        return _getNewTimeObj();
    },
    async stopCurrent(dateEnd?: Date, restart = false) {
        const db = await DatabaseService.get();
        const time = await db.times
            .findOne({
                selector: {
                    isCurrent: 1,
                },
            })
            .exec();
        if (time) {
            const duration = DateConv.timeUTC(dateEnd) - time.start + "";

            await time.atomicUpdate((t) => {
                t.duration = duration;
                t.isCurrent = 0;
                t.needInsert = 1;
                t.needUpdate = 0;
                t.needRemove = 0;
                return t;
            });
            await Dolibarr.updateDolibarr(time);

            if (restart) {
                const obj = _getNewTimeObj(time);
                obj.isCurrent = 1;
                await db.times.insert(obj);
            }
        }
    },
};
export default DatabaseService;
