<template>
    <div class="block-details">
        <div
            class="infoT"
            v-on:click="togglePan()"
            :data-dolibarrid="time.dolibarrid"
        >
            <i
                class="fas"
                v-bind:class="{
                    'fa-unlink': !time.isPersonal,
                    'fa-desktop': time.isPersonal,
                }"
                v-if="!time.isSync()"
            ></i>
            <div class="titleT">
                <div>
                    {{ time.title ? time.title : "-" }}
                </div>
                <div class="subtitle" :title="subtitle">
                    {{ subtitle }}
                </div>
            </div>
            <div class="duration">{{ timeInHMS() }}</div>
        </div>
        <button v-on:click="startTimeFromHere()">
            <i class="fas fa-play"></i>
        </button>
    </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from "vue-property-decorator";

import DatabaseService from "@/plugins/database";
// import Dolibarr from "@/plugins/dolibarr";
import EventBus from "@/plugins/eventBus";
import { RxTimeDocument } from "@/RxDB";

@Component({})
export default class TimeItem extends Vue {
    @Prop() time!: RxTimeDocument;
    private loading = false;
    private subtitle = "";
    // private inProgress = false;

    @Watch("time.taskId", { immediate: true })
    async onChangeTask() {
        await this.generateSubTitle();
    }
    @Watch("time.isPersonal", { immediate: true })
    async onChangePerso() {
        await this.generateSubTitle();
    }

    public async mounted() {
        this.generateSubTitle();
    }

    public togglePan() {
        EventBus.$emit("TOGGLE_PAN", this.time);
    }

    public async startTimeFromHere() {
        const db = await DatabaseService.get();
        DatabaseService.stopCurrent(); //Test if working

        const obj = DatabaseService.getNewTimeObj();
        obj.isCurrent = 1;
        obj.title = this.time.title;
        obj.taskId = this.time.taskId;
        obj.isPersonal = this.time.isPersonal;
        await db.times.insert(obj);
    }

    public async generateSubTitle() {
        let subTitle = "";

        const tk = await this.time.taskId_;
        if (tk != null) {
            subTitle = tk.refPropal + " " + tk.title;
            const pj = await tk.projectId_;
            if (pj != null) {
                subTitle = pj.title + " | " + subTitle;
                const cl = await pj.clientId_;
                if (cl != null) {
                    subTitle = cl.title + " | " + subTitle;
                }
            }
        } else if (this.time.isPersonal) {
            subTitle = "Perso";
        }

        this.subtitle = subTitle;
    }

    public timeInHMS() {
        return new Date(1000 * parseInt(this.time.duration ?? "0", 10))
            .toISOString()
            .substr(11, 8);
    }
}
</script>

<style scoped lang="scss">
.block-details {
    //summary
    padding: 5px;
    border: 1px solid #e9e9e9;
    background: white;
    display: flex;
    align-items: stretch;

    > * {
        cursor: pointer;
    }
    div.infoT {
        display: flex;
        align-items: center;
        flex-grow: 1;
        max-width: calc(100% - 40px);

        i.fas {
            margin-right: 5px;
            font-size: 10px;

            &.fa-unlink {
                color: red;
            }
            &.fa-desktop {
                color: grey;
            }
        }

        .titleT {
            flex-grow: 1;
            overflow: hidden;

            .subtitle {
                color: #808080;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                padding-left: 10px;
            }
        }
        .duration {
            margin: 0 5px;
        }
    }

    button {
        background-color: var(--v-primary-base);
        height: 40px;
        width: 40px;
        border: 0px;
        color: white;
        border-radius: 17px;
        min-width: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
}
</style>
