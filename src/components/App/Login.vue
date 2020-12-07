<template>
    <v-row justify="center" class="login">
        <v-dialog v-model="dialog" persistent max-width="600px">
            <v-form ref="form" v-model="valid" @keyup.native.enter="connect()">
                <v-card>
                    <v-card-title>
                        <span class="headline">Connexion</span>
                    </v-card-title>
                    <v-card-text>
                        <v-container>
                            <v-row>
                                <v-col cols="6">
                                    <v-text-field
                                        label="E-mail"
                                        :rules="emailRules"
                                        v-model="email"
                                        required
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="6">
                                    <v-text-field
                                        label="Mot de passe"
                                        :rules="pwdRules"
                                        type="password"
                                        v-model="pwd"
                                        required
                                    ></v-text-field>
                                    <v-btn
                                        text
                                        :href="urlForgot"
                                        target="_blank"
                                        >Mot de passe oublié ?</v-btn
                                    >
                                </v-col>
                            </v-row>
                        </v-container>
                        <v-alert :value="alert" dismissible type="error">
                            Identifiants incorrects
                        </v-alert>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="blue darken-1" text @click="connect()">
                            Se connecter
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-form>
        </v-dialog>
    </v-row>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import Dolibarr from "@/plugins/dolibarr";
import EventBus from "@/plugins/eventBus";

@Component({})
export default class Login extends Vue {
    private dialog = false;
    private valid = false;
    private email = "";
    private pwd = "";
    private emailRules = [
        (v: string) => !!v || "E-mail requis",
        (v: string) => /.+@.+\..+/.test(v) || "E-mail invalide",
    ];
    private pwdRules = [(v: string) => !!v || "Mdp requis"];
    private alert = false;
    private urlForgot =
        process.env.VUE_APP_DOLIBARR_HOST + "/user/passwordforgotten.php";

    public async mounted() {
        await this.checkCreds();

        EventBus.$on("APP_LOGOUT", async () => {
            await this.checkCreds();
        });
    }

    private async checkCreds() {
        const key = await Dolibarr.checkCred();
        if (!key) {
            this.dialog = true;
        } else {
            this.dialog = false;
        }
    }

    public async connect() {
        this.alert = false;
        //@ts-ignore
        this.$refs.form.validate();
        if (this.valid) {
            const connected = await Dolibarr.connect(this.email, this.pwd);

            if (connected) {
                this.dialog = false;
            } else {
                this.alert = true;
            }
        }
    }
}
</script>

<style scoped lang="scss"></style>
