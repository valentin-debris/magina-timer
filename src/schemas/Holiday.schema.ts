import { RxJsonSchema } from "rxdb";

const schema: RxJsonSchema = {
    title: "holiday schema",
    description: "describes a Holiday",
    version: 0,
    type: "object",
    properties: {
        id: {
            type: "string",
            primary: true,
        },
        description: {
            type: "string",
        },
        fullname: {
            type: "string",
        },
        dateDebut: {
            type: "integer",
        },
        dateFin: {
            type: "integer",
        },
        statut: {
            type: "integer",
            default: 0,
        },
        existRemote: {
            type: "integer",
            default: 0,
        },
        dolibarrId: {
            type: "string",
            default: "",
        },
        owner: {
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
    required: ["fullname"],
    indexes: ["dateDebut", "fullname"],
};

export default schema;
