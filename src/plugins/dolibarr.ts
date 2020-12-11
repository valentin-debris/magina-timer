import axios, { AxiosError } from "axios";

import Config from "@/plugins/electronStore";
import DatabaseService from "./database";
import { RxCollection } from "rxdb";
import { RxTimeDocument } from "@/RxDB";
import errorH from "./errorHandler";
import keytar from "keytar";

require("dotenv").config();

const isDev = process.env.NODE_ENV !== "production";
const keytarService = isDev ? "maginaTimerDev" : "maginaTimerProd";

axios.defaults.baseURL = process.env.VUE_APP_DOLIBARR_HOST + "/api/index.php/";
async function checkCred() {
    const key = await keytar.getPassword(keytarService, "api-key");
    if (key != null) axios.defaults.headers.common["DOLAPIKEY"] = key;
    return key;
}

async function connect(email: string, pwd: string) {
    return axios
        .post("login", {
            login: email,
            password: pwd,
            reset: 0,
        })
        .then(async function(response) {
            const key = response.data.success.token;
            await keytar.setPassword(keytarService, "api-key", key);
            axios.defaults.headers.common["DOLAPIKEY"] = key;

            return true;
        })
        .catch(function(error) {
            if (error.response.status != 403)
                //403 == bad creds
                errorH(error);
            return false;
        });
}

async function getData(type: string, collection: RxCollection, urlApi: string) {
    const key = await checkCred();
    if (!key) return false;

    const keyStore = "lastCalls." + type;
    const lastCall = Config.get(keyStore);

    //To force cleanup, set lastCall to 0
    if (!lastCall && type == "times") {
        collection
            .find({
                selector: {
                    existsRemote: 1,
                },
            })
            .remove();
    }

    const now = parseInt((new Date().getTime() / 1000).toFixed(), 10);
    urlApi += "?last_call=" + lastCall;

    try {
        const response = await axios.get(urlApi);
        console.log("[" + type + "] Import " + response.data.length);
        if (response.data.length > 0) {
            const item = await collection.findOne().exec();
            if (!item) {
                //First import
                await collection.bulkInsert(response.data);
            } else {
                await Promise.all(
                    response.data.map(async (i: RxTimeDocument) => {
                        if (type == "times") {
                            //When sync items, it returns also the ones that we have created between
                            // the last sync & now, so get the right ID to avoid duplicate
                            const dupli = await collection
                                .findOne({
                                    selector: {
                                        dolibarrId: i.dolibarrId,
                                    },
                                })
                                .exec();
                            if (dupli) {
                                i.id = dupli.id;
                            } else if (!i.id) {
                                //The upsert doesn't trigger the "preInsert", used for times
                                i.id = DatabaseService.getRandomId();
                            }
                        }
                        await collection.upsert(i);
                    })
                );
            }
        }

        Config.set(keyStore, now);
    } catch (error) {
        errorH(error);
        return false;
    }
    return true;
}

async function createTime(time: RxTimeDocument) {
    if (!time.taskId || time.taskId == "0") return;

    await checkCred();
    const fdate = time.getFullDate() + " " + time.getTimeStart() + ":00"; //Output : 2020-02-10 18:09:12
    try {
        const response = await axios
            .post("/magina/tasks/" + time.taskId + "/timespents", {
                date: fdate,
                duration: parseInt(time.duration, 10),
                note: time.title,
            })
            .catch(async (err: AxiosError) => {
                //Task doesn't exists => switch to personal
                if (err.response?.status == 404) {
                    await time.atomicUpdate((data) => {
                        data.isPersonal = 1;
                        data.needInsert = 0;
                        data.taskId = "";
                        data.futurTaskId = "";
                        data.dolibarrId = "";
                        return data;
                    });
                }
                return;
            });

        if (response) {
            const dolibarrId = response.data.success.id;
            await time.atomicUpdate((data) => {
                data.needInsert = 0;
                data.existRemote = 1;
                data.futurTaskId = "";
                data.dolibarrId = dolibarrId + "";
                return data;
            });
        }

        return true;
    } catch (error) {
        errorH(error);
        return false;
    }
}

async function updateTime(time: RxTimeDocument) {
    if (!time.taskId || time.taskId == "0") return;

    await checkCred();
    const fdate = time.getFullDate() + " " + time.getTimeStart() + ":00"; //Output : 2020-02-10 18:09:12
    try {
        const resp = await axios
            .put(
                "/magina/tasks/" +
                    time.taskId +
                    "/timespents/" +
                    time.dolibarrId,
                {
                    date: fdate,
                    duration: parseInt(time.duration, 10),
                    note: time.title,
                }
            )
            .catch(async (err: AxiosError) => {
                //Task/Time doesn't exist => switch to personal
                if (err.response?.status == 404) {
                    await time.atomicUpdate((data) => {
                        data.isPersonal = 1;
                        data.needInsert = 0;
                        data.needUpdate = 0;
                        data.taskId = "";
                        data.futurTaskId = "";
                        data.dolibarrId = "";
                        return data;
                    });
                }
                return;
            });
        if (resp) {
            await time.atomicUpdate((data) => {
                data.needUpdate = 0;
                data.futurTaskId = "";
                return data;
            });
        }
        return true;
    } catch (error) {
        errorH(error);
        return false;
    }
}

async function removeTime(time: RxTimeDocument) {
    await checkCred();

    try {
        await axios.delete(
            "/magina/tasks/" + time.taskId + "/timespents/" + time.dolibarrId
        );
    } catch (error) {
        //If not 404, problem is not about a missing item, so stop here
        if (error.response.status != 404) return false;
    }

    if (time.isPersonal) {
        await time.atomicUpdate((data) => {
            data.taskId = "";
            data.futurTaskId = "";
            data.dolibarrId = "";
            data.needUpdate = 0;
            data.needRemove = 0;
            data.needInsert = 0; //Will be skip until a real task is defined, but to show it's not sync with Dolibarr
            return data;
        });
        return false; // Keep it if it's link to a perso
    }

    await time.remove();

    return true;
}

async function logout() {
    await keytar.deletePassword(keytarService, "api-key");
}

async function getClients() {
    const db = await DatabaseService.get();
    return await getData("clients", db.clients, "/magina/v1/clients");
}

async function getProjects() {
    const db = await DatabaseService.get();
    return await getData("projects", db.projects, "/magina/v1/projects");
}

async function getTasks() {
    const db = await DatabaseService.get();
    return await getData("tasks", db.tasks, "/magina/v1/tasks");
}

async function getTimes() {
    const db = await DatabaseService.get();
    return await getData("times", db.times, "/magina/v1/timespents");
}

async function updateDolibarr(time: RxTimeDocument) {
    if (time.isCurrent == 0 && !time.isSync()) {
        if (time.dolibarrId != "") {
            if (time.needRemove || time.isPersonal) {
                await removeTime(time);
            } else {
                if (time.futurTaskId && time.futurTaskId != "0") {
                    const obj = DatabaseService.getNewTimeObj();
                    obj.start = time.start;
                    obj.title = time.title;
                    obj.duration = time.duration;
                    obj.taskId = time.futurTaskId!;
                    obj.needInsert = 1;
                    const success = await removeTime(time);
                    if (success) {
                        const db = await DatabaseService.get();
                        const newT = await db.times.insert(obj); //The insert will be trigger by this listener and the time will be pushed
                        await createTime(newT);
                    }
                } else {
                    await updateTime(time);
                }
            }
        } else if (time.needRemove) {
            await time.remove();
        } else if (time.needInsert && time.taskId) {
            await createTime(time);
        }
    }
}

export default {
    getClients,
    getProjects,
    getTasks,
    getTimes,
    connect,
    logout,
    checkCred,
    createTime,
    updateTime,
    removeTime,
    updateDolibarr,
};
