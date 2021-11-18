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
import { parseDrupalOrgTab, readIssueContent } from '@/popup';
import drupalpodForm from './drupalpod-form/drupalpod-form.vue';
import { IssueMetadata } from './models/issue-metadata';

export interface AppData {
  errors: string[];
  loaded: boolean;
  issueMetadata?: IssueMetadata;
}

export default defineComponent({
  components: { drupalpodForm },
  errorMessages: [
    'Open an issue page on Drupal.org to see the available options',
  ],
  data(): AppData {
    return {
      errors: [],
      loaded: false,
    };
  },
  mounted(): void {
    document.addEventListener('DOMContentLoaded', (): void => {
      parseDrupalOrgTab()
        .then(() => readIssueContent())
        .then((metadata: IssueMetadata) => {
          // Hide 'please wait' message.
          this.loaded = true;
          this.issueMetadata = metadata;
          if (this.issueMetadata) {
            if (!this.issueMetadata.loggedIn) {
              this.errors.push('Please log in to Drupal.org');
            }
            if (!this.issueMetadata.pushAccess) {
              this.errors.push('Please click on the "Get push access" green button on this issue page.');
            }
            if (this.issueMetadata.issueBranches.length === 0) {
              this.errors.push('Please click on the "Create issue fork" green button on this issue page.');
            }
            if (!this.issueMetadata.success) {
              this.errors.push('Something went wrong, please report the error');
            }
          }
        })
        .catch((errorMessage: string) => {
          this.loaded = false;
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
      <p v-if="!loaded && errors?.length === 0" class="reading-page-status">
        Please wait...
      </p>
    </header>

    <aside v-if="errors?.length > 0" class="warnings" role="alert">
      <p v-for="(error, index) in errors" :key="index">
        {{ error }}
      </p>
    </aside>

    <hr>

    <drupalpod-form v-if="loaded" v-bind:issueMetadata="issueMetadata"></drupalpod-form>
  </div>
</template>
