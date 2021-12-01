import { expect } from 'chai';
import { shallowMount } from '@vue/test-utils';
import App from '@/App.vue';

describe('App', () => {
  it('should work', () => {
    const wrapper = shallowMount(App);
    expect(wrapper.html()).to.include('<div class="container">\n  <drupalpod-stub></drupalpod-stub>\n</div>');
  });
});
