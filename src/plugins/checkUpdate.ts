import { app, dialog } from "electron";

import { autoUpdater } from "electron-updater";
import errorH from "./errorHandler";

const isDev = process.env.NODE_ENV !== "production";

async function checkUpdate() {
    if (isDev) return;

    try {
        autoUpdater.logger = require("electron-log");

        autoUpdater.on("error", (message: Error) => {
            errorH(message);
        });

        autoUpdater.on(
            "update-downloaded",
            async (info: Custom.UpdateInfoB) => {
                const notes = "Nouveautés : \n" + info.releaseNotes.replace(/<[^>]*>?/gm, '');

                const dialogOpts = {
                    type: "info",
                    buttons: ["Redémarrer", "Plus tard"],
                    title: "Mise à jour disponible",
                    message: "Une nouvelle version a été téléchargée. Redémarrez l'application pour appliquer les mises à jour.",
                    detail: notes,
                };

                dialog.showMessageBox(dialogOpts).then((returnValue) => {
                    if (returnValue.response === 0) {
                        // @ts-ignore
                        app.isQuiting = true;
                        autoUpdater.quitAndInstall();
                    }
                });
            }
        );

        autoUpdater.checkForUpdates();
        //Every hour
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 3600000);
    } catch (error) {
        errorH(error);
    }
}
export default checkUpdate;
