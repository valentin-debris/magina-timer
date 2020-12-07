import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
    title: "time schema",
    description: "describes a TimeSpent",
    version: 2,
    type: "object",
    properties: {
        id: {
            type: "string",
            primary: true,
        },
        title: {
            type: "string",
        },
        start: {
            type: "integer",
        },
        duration: {
            type: "string",
            default: "0",
        },
        taskId: {
            type: "string",
            default: "0",
            ref: "tasks",
        },
        futurTaskId: {
            //Used when change the Task (dolibarr needs to remove&create time is task change)
            type: "string",
            default: "0",
        },
        isPersonal: {
            type: "integer",
            default: 0,
        },
        dolibarrId: {
            type: "string",
            default: "",
        },
        existRemote: {
            type: "integer",
            default: 0,
        },
        isCurrent: {
            type: "integer",
            default: 0,
        },
        needInsert: {
            type: "integer",
            default: 0,
        },
        needUpdate: {
            type: "integer",
            default: 0,
        },
        needRemove: {
            type: "integer",
            default: 0,
        },
    },
    required: ["taskId"],
    indexes: ["taskId", "start", "title"],
};

export default schema;
