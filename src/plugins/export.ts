import { remote, shell } from "electron";

import Config from "./electronStore";
import DatabaseService from "./database";
import { RxClientDocument } from "@/RxDB";
import XLSX from "xlsx";
import errorH from "./errorHandler";
//@ts-ignore
import wbDetails from "../assets/xlsx/template_details.xlsx";
//@ts-ignore
import wbHours from "../assets/xlsx/template_hours.xlsx";

let wsT: XLSX.WorkSheet | null = null;

function updateValue(val: any, cell: string) {
    if (!wsT) return;

    if (!(val instanceof Array)) {
        val = [[val]];
    }

    XLSX.utils.sheet_add_aoa(wsT, val, { origin: cell });
}

async function askLocation(fileName: string) {
    //@ts-ignore
    const dial = await remote.dialog.showSaveDialog(null, {
        defaultPath: fileName,
        filters: [
            { name: "Excel", extensions: ["xlsx"] },
            { name: "All Files", extensions: ["*"] },
        ],
    });
    const pathSave = dial.filePath;
    return pathSave;
}

async function openFile(pathFile: string): Promise<boolean> {
    if (!pathFile) return false;

    try {
        await shell.openPath(pathFile);
        return true;
    } catch (error) {
        errorH(error);
    }
    return false;
}

async function exportHours(
    startMonth: string,
    round: boolean
): Promise<boolean> {
    try {
        const currentWB = JSON.parse(JSON.stringify(wbHours)); //Deep copy
        const dayT = new Date(startMonth + "-01");
        const pathSave = await askLocation("detail_heures_" + startMonth);
        if (!pathSave) return false;

        const { fullName, salary, hours } = Config.get("preferences.files");
        const firstSheetName = currentWB.SheetNames[0];
        wsT = currentWB.Sheets[firstSheetName];

        const options = {
            month: "long",
            year: "numeric",
        };
        const monthYear = dayT.toLocaleDateString("fr-FR", options);

        updateValue("MOIS : " + monthYear, "B3");
        updateValue("Brut mensuel : " + salary, "E3");
        updateValue("Mensualisation heures : " + hours, "E4");
        updateValue("NOM DU SALARIE : " + fullName, "B5");

        const nbDaysInMonth = new Date(
            dayT.getFullYear(),
            dayT.getMonth(),
            0
        ).getDate();

        let numCell = 8; //Cell for first Monday in Excel
        if (dayT.getDay() == 0) {
            //If sunday, select monday
            dayT.setDate(dayT.getDate() + 1);
        } else if (dayT.getDay() == 6) {
            //If saturday, select monday
            dayT.setDate(dayT.getDate() + 2);
        } else {
            numCell += dayT.getDay() - 1;
        }

        let left = 0;
        const db = await DatabaseService.get();

        let firstLoop = true;
        for (let i = dayT.getDate(); i <= nbDaysInMonth; i++) {
            const nextT = new Date(dayT.getTime());
            nextT.setHours(24, 59, 59, 9999);

            const items = await db.times
                .find({
                    selector: {
                        $and: [
                            {
                                start: {
                                    $gte: Math.trunc(dayT.getTime() / 1000),
                                },
                            },
                            {
                                start: {
                                    $lte: Math.trunc(nextT.getTime() / 1000),
                                },
                            },
                        ],
                    },
                })
                .exec();

            //If Monday, skip the empty cells
            if (!firstLoop && dayT.getDay() == 1) numCell += 4;
            firstLoop = false;

            dayT.setDate(dayT.getDate() + 1); //Prepare for next day

            //If no time, go to next day
            if (!items || items.length == 0) {
                numCell++;
                continue;
            }

            let totalSec = 0;
            items.forEach((i) => (totalSec += parseInt(i.duration, 10)));

            let durationDay =
                Math.round(((totalSec + Number.EPSILON) / 3600) * 100) / 100;

            if (round) {
                durationDay += left; //Add the part removed/added from the previous round, to avoid loosing/earning time

                //Round to the nearest 0.5
                const rounded = Math.round(durationDay * 2) / 2;
                left = durationDay - rounded; //retrieve the removed/added time
                durationDay = rounded;
            }
            if (durationDay > 0) updateValue(durationDay, "C" + numCell);
            numCell++;
        }

        XLSX.writeFile(currentWB, pathSave);
        return await openFile(pathSave);
    } catch (error2) {
        errorH(error2);
    }
    return false;
}

//startMonth <=> 2020-08 if august

async function exportDetails(
    start: string,
    end: string,
    round: boolean,
    client: RxClientDocument | null,
    showDesc: boolean
): Promise<boolean> {
    try {
        const currentWB = JSON.parse(JSON.stringify(wbDetails)); //Deep copy
        let fileName = "detail_activites_" + start + "_" + end + "_";
        if (client) {
            fileName += "_" + client.title.replace(/[^a-zA-Z0-9_]/g, "-");
        }
        const pathSave = await askLocation(fileName);
        if (!pathSave) return false;

        const firstSheetName = currentWB.SheetNames[0];
        wsT = currentWB.Sheets[firstSheetName];

        const dayStart = new Date(start);
        const dayEnd = new Date(end);
        dayEnd.setHours(24, 59, 59, 9999);

        const paramsTimes = {
            selector: {
                $and: [
                    { start: { $gte: dayStart.getTime() / 1000 } },
                    { start: { $lte: dayEnd.getTime() / 1000 } },
                ],
            },
        };
        const db = await DatabaseService.get();

        if (client) {
            const itemsPj = await db.projects
                .find({
                    selector: {
                        clientId: client.id + "",
                    },
                })
                .exec();

            const projectIds: string[] = [];
            itemsPj.map((i) => {
                projectIds.push(i.id + "");
            });

            const itemsTk = await db.tasks
                .find({
                    selector: {
                        projectId: { $in: projectIds },
                    },
                })
                .exec();

            const taskIds: string[] = [];
            itemsTk.map((i) => {
                taskIds.push(i.id + "");
            });

            // @ts-ignore
            paramsTimes.selector.$and.push({ taskId: { $in: taskIds } });
        }

        const times = await db.times.find(paramsTimes).exec();
        for (const time of times) {
            let sortVal = "";
            let tkT = null,
                pjT = null;
            if (!time.isPersonal) {
                tkT = await time.taskId_;
                if (tkT) {
                    pjT = await tkT.projectId_;
                }
            }
            sortVal =
                (pjT ? pjT.clientId + "-" + pjT.id : "-") + "-" + time.taskId ??
                "perso";

            time.sortVal = sortVal + "-" + time.title;
        }
        times.sort((a, b) => (a.sortVal! > b.sortVal! ? 1 : -1));

        let prevTask: string | number = -1;
        let totalSec = 0;
        let subDescs = [];
        let numCell = 2;

        let j = 0;
        const nbElems = times.length;

        for (const i of times) {
            j++;
            if (prevTask == -1) {
                prevTask = i.taskId;
            } else if (!i.taskId || prevTask != i.taskId || j == nbElems) {
                let finalNewLoop = false;
                do {
                    finalNewLoop = false;
                    if (j == nbElems) {
                        if (prevTask == i.taskId) {
                            totalSec += parseInt(i.duration, 10);
                            subDescs.push(i);
                        } else {
                            //This happened when the LAST time is a new one, so redone a loop for this (the prevTask is updated before the end of loop)
                            finalNewLoop = true;
                        }
                    }

                    let durationTask =
                        Math.round(((totalSec + Number.EPSILON) / 3600) * 100) /
                        100;

                    if (round) {
                        const rounded = Math.round(durationTask * 2) / 2;
                        durationTask = rounded;
                    }

                    let clTitle = "-",
                        pjTitle = "-",
                        pjRef = "-",
                        tkTitle = "-",
                        tkRefPropal = "-";

                    const tk = await db.tasks
                        .findOne({
                            selector: {
                                id: prevTask,
                            },
                        })
                        .exec();

                    if (tk) {
                        tkTitle = tk.title;
                        tkRefPropal = tk.refPropal;

                        const pj = await tk.projectId_;
                        if (pj) {
                            pjTitle = pj.title;
                            pjRef = pj.ref;

                            const cl = await pj.clientId_;
                            if (cl) {
                                clTitle = cl.title;
                            }
                        }
                    } else {
                        clTitle = "Perso";
                    }
                    updateValue(
                        [
                            [
                                clTitle,
                                pjTitle,
                                pjRef,
                                tkTitle,
                                tkRefPropal,
                                durationTask,
                            ],
                        ],
                        "A" + numCell
                    );
                    numCell++;

                    if (showDesc) {
                        let prevDesc = "";
                        let totalSubDuration = 0;
                        let jSubs = 0;
                        let dateStart = 0;
                        let dateEnd = 0;
                        const nbElemSubs = subDescs.length;
                        for (const k of subDescs) {
                            jSubs++;

                            if (jSubs == 1) {
                                prevDesc = k.title;
                                dateStart = k.start;
                                dateEnd = k.start;
                            }

                            if (k.title != prevDesc || jSubs == nbElemSubs) {
                                let finalNewLoopDesc = false;
                                do {
                                    finalNewLoopDesc = false;

                                    if (jSubs == nbElemSubs) {
                                        if (prevDesc == k.title) {
                                            totalSubDuration += parseInt(
                                                k.duration,
                                                10
                                            );
                                            if (k.start < dateStart)
                                                dateStart = k.start;
                                            if (k.start > dateEnd)
                                                dateEnd = k.start;
                                        } else {
                                            //This happened when the LAST time is a new one, so redone a loop for this (the prevDesc is updated before the end of loop)
                                            finalNewLoopDesc = true;
                                        }
                                    }
                                    updateValue(
                                        "-- " + prevDesc,
                                        "D" + numCell
                                    );
                                    updateValue(
                                        Math.round(
                                            ((totalSubDuration +
                                                Number.EPSILON) /
                                                3600) *
                                                100
                                        ) / 100,
                                        "G" + numCell
                                    );

                                    const strDate = new Date(dateStart * 1000)
                                        .toISOString()
                                        .substr(0, 10);
                                    updateValue(strDate, "H" + numCell);
                                    const strDateEnd = new Date(dateEnd * 1000)
                                        .toISOString()
                                        .substr(0, 10);

                                    if (strDateEnd != strDate)
                                        updateValue(strDateEnd, "I" + numCell);

                                    numCell++;
                                    prevDesc = k.title;
                                    totalSubDuration = 0;
                                    dateStart = k.start;
                                    dateEnd = k.start;
                                } while (finalNewLoopDesc);
                            }

                            totalSubDuration += parseInt(k.duration, 10);
                            if (k.start < dateStart) dateStart = k.start;
                            if (k.start > dateEnd) dateEnd = k.start;
                        }
                        subDescs = [];
                    }

                    prevTask = i.taskId;
                    numCell++;
                    totalSec = 0;
                } while (finalNewLoop);
            }
            totalSec += parseInt(i.duration, 10);
            subDescs.push(i);
        }

        numCell += 2;
        updateValue([["TOTAL", "--"]], "E" + numCell);
        wsT!["F" + numCell] = { f: "SUM(F2:F" + (numCell - 2) + ")" };

        XLSX.writeFile(currentWB, pathSave);
        return await openFile(pathSave);
    } catch (error2) {
        errorH(error2);
    }
    return false;
}

export default {
    exportHours,
    exportDetails,
};
