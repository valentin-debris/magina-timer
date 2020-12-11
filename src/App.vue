<template>
    <v-app>
        <v-app-bar app color="primary" dark>
            <Header />
        </v-app-bar>

        <v-main>
            <Login />
            <HomePage />
            <Panel />
            <Filters />
            <Notifications />

            <v-snackbar v-model="snackbar" :timeout="durationSk">
                {{ messageSk }}
            </v-snackbar>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import { ipcRenderer, remote } from "electron";
import { Component, Vue } from "vue-property-decorator";
import { RxItemsCollections, RxTimeDocument } from "@/RxDB";

import Config from "@/plugins/electronStore";
import DatabaseService from "@/plugins/database";
import Dolibarr from "@/plugins/dolibarr";
import Filters from "@/components/App/Filters.vue";
import Header from "@/components/App/Header.vue";
import HomePage from "@/components/App/HomePage.vue";
import Login from "@/components/App/Login.vue";
import Notifications from "@/components/App/Notifications.vue";
import Panel from "@/components/App/Panel.vue";
import { RxDatabase } from "rxdb";
import { Subscription } from "rxjs";
// @ts-ignore
import iconNotif from "./assets/images/logo-notif.png";
import EventBus from "./plugins/eventBus";

@Component({
    components: { Login, HomePage, Header, Panel, Filters, Notifications },
})
export default class App extends Vue {
    private timeCurrent: RxTimeDocument | null = null;
    private sub: Subscription | null = null;
    private db!: RxDatabase<RxItemsCollections>;
    private messageSk = "";
    private durationSk = 3000;
    private snackbar = false;

    private lastCheckNotif = new Date();
    private intervalIdle: NodeJS.Timeout | null = null;

    public async mounted() {
        console.log("[App] mounted : " + process.env.VUE_APP_DOLIBARR_HOST);

        this.db = await DatabaseService.get();
        this.sub = this.db.times
            .findOne({
                selector: {
                    isCurrent: 1,
                },
            })
            .$.subscribe((time) => {
                this.timeCurrent = time;
            });

        ipcRenderer.on("logout", () => {
            Dolibarr.logout();
            EventBus.$emit("APP_LOGOUT");
        });

        ipcRenderer.on("openFromLink", async (event, arg) => {
            console.log("[APP] OpenFromLink");

            // if(arg.title) {
            //     form.querySelector('input[name="title"]').value = arg.title;
            // }
            // if(arg.projectId) {
            //     initPanSelects(arg.projectId, "project", true);
            // } else if(arg.taskId) {
            //     initPanSelects(arg.taskId, "task", true);
            // }
            console.log(arg);
            //TODO-mg improve here when links available (MGC ?)
        });

        await this.synchro();
        ipcRenderer.on("synchronize", async () => {
            await this.synchro();
        });

        EventBus.$on("APP_SYNCHRONIZE_RUN", async () => {
            await this.synchro();
        });

        EventBus.$on("SHOW_SNAKBAR", (mes: string, duration = 3000) => {
            if (mes) {
                this.messageSk = mes;
                this.durationSk = duration;
                this.snackbar = true;
            }
        });

        if (this.intervalIdle) {
            clearInterval(this.intervalIdle);
        }
        this.intervalIdle = setInterval(this.checkIdleTime, 30000); //Check every 30s the idle time

        setInterval(this.checkNoTimeRunning, 10000);
    }

    public async checkNoTimeRunning() {
        const now = new Date();
        const diffTime =
            Math.abs(now.getTime() - this.lastCheckNotif.getTime()) / 1000 / 60; //Diff in minutes

        const prefStart = Config.get("preferences.notifStart");

        if (!prefStart || this.timeCurrent || Math.round(diffTime) < 5) return;

        const notification = {
            title: "Pensez à tracker votre temps",
            body: "On arrête de se tourner les pouces et on bosse !",
            icon: iconNotif,
        };

        const notifTime = new window.Notification(
            notification.title,
            notification
        );

        notifTime.onclick = () => {
            if (!this.timeCurrent) {
                const obj = DatabaseService.getNewTimeObj();
                obj.isPersonal = 1;
                obj.isCurrent = 1;

                this.db.times.insert(obj);
                ipcRenderer.invoke("show_foreground");
            }
        };
        this.lastCheckNotif = new Date();
    }

    public async checkIdleTime() {
        const prefAway: boolean = Config.get("preferences.notifAway");
        const prefAwayDelay: number = Config.get("preferences.notifAwayDelay");

        //If inative for the last 5min, popup info
        if (
            prefAway &&
            this.timeCurrent &&
            remote.powerMonitor.getSystemIdleTime() > prefAwayDelay * 60
        ) {
            await ipcRenderer.invoke("openPopupIdle");
        }
    }

    async synchro() {
        this.messageSk = "Synchronisation en cours...";
        this.durationSk = 30000;
        this.snackbar = true;

        const db = await DatabaseService.get();
        const items = await db.times
            .find({
                selector: {
                    $or: [
                        { needInsert: 1 },
                        { needUpdate: 1 },
                        { needRemove: 1 },
                    ],
                },
            })
            .exec();

        await Promise.all(
            items.map(async (i) => {
                await Dolibarr.updateDolibarr(i);
            })
        );

        const syncs = [
            Dolibarr.getClients(),
            Dolibarr.getProjects(),
            Dolibarr.getTasks(),
            Dolibarr.getTimes(),
        ];

        await Promise.all(syncs).then((results) => {
            const checker = results.every((v) => v === true);

            if (checker == true) {
                console.log("[HP] Sync done");

                this.messageSk = "Synchronisation terminée !";
                this.durationSk = 2000;
                EventBus.$emit("APP_SYNCHRONIZE_DONE");
            } else {
                console.log("[HP] Sync failed");
                this.messageSk =
                    "La synchronisation a échoué. Réessayez ou reconnectez-vous.";
                this.durationSk = 10000;
            }
        });
    }

    public beforeDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }
}
</script>

<style scoped lang="scss">
.v-application {
    font-family: Arial, sans-serif !important;
    font-size: 16px;
    .title {
        // To pin point specific classes of some components
        font-family: Arial, sans-serif !important;
        font-size: 16px;
    }

    header {
        height: 68px !important;
    }

    main {
        padding-top: 68px !important;
    }
}
</style>