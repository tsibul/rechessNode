import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

// This is an example test file that demonstrates different types of tests
// You can use this as a reference when writing tests for your components

describe('Example Component Test', () => {
  it('mounts a component', () => {
    const wrapper = mount({
      template: '<div>Hello World</div>'
    })
    expect(wrapper.text()).toBe('Hello World')
  })

  it('demonstrates async testing', async () => {
    const wrapper = mount({
      template: '<button @click="count++">{{ count }}</button>',
      data() {
        return {
          count: 0
        }
      }
    })

    expect(wrapper.text()).toBe('0')
    await wrapper.trigger('click')
    expect(wrapper.text()).toBe('1')
  })
}) 