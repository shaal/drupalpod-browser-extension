import { expect } from 'chai';
import { shallowMount, VueWrapper } from '@vue/test-utils';

import drupalpod from '@/drupalpod/drupalpod.vue';

describe('drupalpod', () => {
  // @todo figure out how to type this correctly. Vue.js documentation does not seem to have
  // typescript definitions that make any sense.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    wrapper = shallowMount(drupalpod, {
      global: {
        provide: {
          drupal: null,
        },
      },
    });
  });

  it('should work', () => {
    const el = wrapper.find('h2');
    expect(el.text()).to.equal('DrupalPod');
  });
});
