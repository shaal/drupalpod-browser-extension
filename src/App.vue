<style scoped>
.logo {
  float: right;
  padding-left: 2em;
}
.warnings {
  color: red;
}
</style>

<script lang="ts">
import { defineComponent } from 'vue';
import { getDrupalPodRepo, parseDrupalOrgTab } from '@/popup';

export interface AppData {
  errors: string[];
  loaded: boolean;
}

export default defineComponent({
  errorMessages: [
    'Something went wrong, please report the error',
    'Open an issue page on Drupal.org to see the available options',
    'Please click on the "Create issue fork" green button on this issue page.',
    'Please click on the "Get push access" green button on this issue page.',
    'Please log in to Drupal.org',
  ],
  data(): AppData {
    return { errors: [], loaded: false };
  },
  mounted(): void {
    document.addEventListener('DOMContentLoaded', (): void => {
      getDrupalPodRepo();

      parseDrupalOrgTab()
        .then(() => {
          // Hide 'please wait' message.
          this.loaded = true;

          // Activate button.
          const button = document.getElementById('submit') as HTMLElement;
          button.addEventListener('click', () => {
            console.log('openDevEnv()');
          });
        })
        .catch((errorMessage: string) => {
          this.loaded = true;
          this.errors = [errorMessage];
        });
    });
  },
});
</script>

<template>
  <div class="container">
    <header class="page-header">
      <h2>
        DrupalPod
        <img class="logo" src="./assets/DrupalPod-128.png" alt="DrupalPod Logo" role="presentation">
      </h2>
      <p v-if="!loaded" class="reading-page-status">
        Please wait...
      </p>
    </header>

    <aside v-if="errors && errors.length > 0" class="warnings" role="alert">
      <p v-for="(error, index) in errors" :key="index">
        {{ error }}
      </p>
    </aside>

    <hr>

    <form class="form-selection hidden" id="form-selection" aria-live="polite">
      <p class="hidden"><strong>DrupalPod repo: <span id="devdrupalpod"></span></strong></p>
      <p><strong>Project name: <span id="project-name"></span></strong></p>
      <p><strong>Project type: <span id="project-type"></span></strong></p>
      <p><strong>Module Version: <span id="module-version"></span></strong></p>
      <p class="hidden"><strong>Repo: <span id="drupalpod-repo"></span></strong></p>
      <p><strong>Issue fork: <span id="issue-fork"></span></strong></p>
      <p>Select from the options below:</p>
      <label for="issue-branch">Branch:</label>
      <select name="issue-branch" id="issue-branch">
      </select>
      <br>
      <label for="core-version">Drupal core version:</label>
      <select name="core-version" id="core-version">
      </select>
      <br>
      <label for="available-patches">Choose a patch:</label>
      <select name="available-patches" id="available-patches">
      </select>
      <br>
      <label for="install-profile">Install profile:</label>
      <select name="install-profile" id="install-profile">
      </select>
      <br>
      <br>
      <button id="submit" type="submit"><h2>Open Dev Env</h2></button>
    </form>
  </div>
</template>
