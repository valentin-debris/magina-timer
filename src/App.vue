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
    // private checkLogin = "";
    // private checkSync = "";

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
            // this.checkLogin = new Date().toISOString(); //Used to trigger change under "Login.vue"
        });

        ipcRenderer.on("synchronize", () => {
            EventBus.$emit("APP_SYNCHRONIZE");
            // this.checkSync = new Date().toISOString(); //Used to trigger change under "HomePage.vue"
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
            icon: iconNotif, //path.join(__dirname, "../assets/images/logo-transp.png"),
        };

        const notifTime = new window.Notification(
            notification.title,
            notification
        );

        notifTime.onclick = () => {
            const obj = DatabaseService.getNewTimeObj();
            obj.isPersonal = 1;
            obj.isCurrent = 1;

            if (!this.timeCurrent) {
                this.db.times.insert(obj);
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
