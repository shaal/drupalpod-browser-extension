<style scoped>
.form-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: baseline;
}

.form-description {
  width: 100%;
}

#submit {
  font-size: 2rem;
}

.item-list {
  list-style: none;
}
.list-item--inline {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: baseline;
}
</style>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IssueMetadata } from '@/models/issue-metadata';
import { getDrupalPodRepo, openDevEnv } from '../popup';

export default defineComponent({
  props: {
    issueMetadata: Object as PropType<IssueMetadata>,
  },
  data(): any {
    return {
      envRepo: '',
      coreVersions: ['9.2.0', '8.9.x', '9.0.x', '9.1.x', '9.2.x', '9.3.x'],
      installProfiles: ['(none)', 'standard', 'demo_umami', 'minimal'],
      formData: {
        issueBranch: null,
        coreVersion: null,
        installProfile: null,
        patch: null,
      },
    };
  },
  methods: {
    open(): void {
      const {
        issueFork,
        moduleVersion,
        projectName,
        projectType,
      } = this.issueMetadata;
      const {
        issueBranch,
        coreVersion,
        installProfile,
        patch,
      } = this.formData;

      openDevEnv(
        this.envRepo,
        projectName,
        issueFork,
        issueBranch,
        projectType,
        moduleVersion,
        coreVersion,
        patch,
        installProfile,
      ).then(() => {
        window.close();
      }).catch((error) => {
        console.error(error);
      });
    },
  },
  mounted(): void {
    getDrupalPodRepo()
      .then((url) => {
        this.envRepo = url;
      })
      .catch((err) => {
        console.error(err);
        this.envRepo = '';
      });
  },
});
</script>

<template>
  <form id="form-selection" aria-live="polite" v-on:submit="open" aria-describedby="form-description">
    <aside>
      <ul class="item-list">
        <li class="list-item list-item--inline">
          <strong>Project name:</strong>
          <span id="project-name">{{ issueMetadata.projectName }}</span>
        </li>
        <li class="list-item list-item--inline">
          <strong>Project type:</strong>
          <span id="project-type">{{ issueMetadata.projectType }}</span>
        </li>
        <li class="list-item list-item--inline">
          <strong>Module Version:</strong>
          <span id="module-version">{{ issueMetadata.moduleVersion }}</span>
        </li>
        <li class="list-item list-item--inline">
          <strong>Issue fork:</strong>
          <span id="issue-fork">{{ issueMetadata.issueFork }}</span>
        </li>
      </ul>
    </aside>
    <p id="form-description" class="form-description">Select from the options below:</p>
    <div class="form-group">
      <label for="issue-branch">Branch:</label>
      <select name="issue-branch" id="issue-branch" v-model="formData.issueBranch">
        <option v-for="(option, index) in issueMetadata.issueBranches" :key="index" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
    <div class="form-group">
      <label for="core-version">Drupal core version:</label>
      <select name="core-version" id="core-version" v-model="formData.coreVersion">
        <option v-for="(option, index) in coreVersions" :key="index" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
    <div class="form-group">
      <label for="available-patches">Choose a patch:</label>
      <select name="available-patches" id="available-patches" v-model="formData.patch">
        <option v-for="(option, index) in issueMetadata.availablePatches" :key="index" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
    <div class="form-group">
      <label for="install-profile">Install profile:</label>
      <select name="install-profile" id="install-profile" v-model="formData.installProfile">
        <option v-for="(option, index) in installProfiles" :key="index" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
    <button id="submit" type="submit" tabindex="0">Open Dev Env</button>
  </form>
</template>
