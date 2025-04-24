import { describe, test, expect, beforeEach } from 'vitest'
import { world as ecsWorld } from '../../world'
import { createInputSystem } from '../InputSystems'
import { GameEntity, PhysicsInput } from '../../types'

describe('InputSystem', () => {
  let inputSystem: ReturnType<typeof createInputSystem>

  beforeEach(() => {
    inputSystem = createInputSystem()
    ecsWorld.clear()
  })

  test('should add input to buffer', () => {
    const input: PhysicsInput = {
      forward: true,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
      rollLeft: false,
      rollRight: false,
      fire: false,
      zoom: false,
      nextWeapon: false,
      previousWeapon: false,
      weapon1: false,
      weapon2: false,
      weapon3: false,
      mouseDelta: { x: 0, y: 0 },
      tick: 1,
      timestamp: Date.now()
    }

    inputSystem.addInput('player1', input)
    expect(inputSystem.getLastProcessedInputTick('player1')).toBe(0)
  })

  test('should process inputs in order', () => {
    const entity = ecsWorld.add({
      id: 'player1',
      input: {},
      body: {}
    } as GameEntity)

    const input1: PhysicsInput = {
      forward: true,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
      rollLeft: false,
      rollRight: false,
      fire: false,
      zoom: false,
      nextWeapon: false,
      previousWeapon: false,
      weapon1: false,
      weapon2: false,
      weapon3: false,
      mouseDelta: { x: 0, y: 0 },
      tick: 1,
      timestamp: Date.now()
    }

    const input2: PhysicsInput = {
      ...input1,
      forward: false,
      backward: true,
      tick: 2
    }

    inputSystem.addInput('player1', input2)
    inputSystem.addInput('player1', input1)
    inputSystem.update(1/60)

    expect(entity.input).toEqual(input2)
    expect(inputSystem.getLastProcessedInputTick('player1')).toBe(2)
  })

  test('should limit buffer size', () => {
    const entity = ecsWorld.add({
      id: 'player1',
      input: {},
      body: {}
    } as GameEntity)

    // Add more inputs than the buffer size
    for (let i = 0; i < 100; i++) {
      inputSystem.addInput('player1', {
        forward: true,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        pitchUp: false,
        pitchDown: false,
        yawLeft: false,
        yawRight: false,
        rollLeft: false,
        rollRight: false,
        fire: false,
        zoom: false,
        nextWeapon: false,
        previousWeapon: false,
        weapon1: false,
        weapon2: false,
        weapon3: false,
        mouseDelta: { x: 0, y: 0 },
        tick: i,
        timestamp: Date.now()
      })
    }

    inputSystem.update(1/60)

    // Should only process the latest input
    expect((entity.input as PhysicsInput).tick).toBe(99)
  })

  test('should cleanup input buffers', () => {
    const input: PhysicsInput = {
      forward: true,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
      rollLeft: false,
      rollRight: false,
      fire: false,
      zoom: false,
      nextWeapon: false,
      previousWeapon: false,
      weapon1: false,
      weapon2: false,
      weapon3: false,
      mouseDelta: { x: 0, y: 0 },
      tick: 1,
      timestamp: Date.now()
    }

    inputSystem.addInput('player1', input)
    inputSystem.cleanup('player1')

    expect(inputSystem.getLastProcessedInputTick('player1')).toBe(0)
  })

  test('should handle multiple entities', () => {
    const entity1 = ecsWorld.add({
      id: 'player1',
      input: {},
      body: {}
    } as GameEntity)

    const entity2 = ecsWorld.add({
      id: 'player2',
      input: {},
      body: {}
    } as GameEntity)

    const input1: PhysicsInput = {
      forward: true,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
      rollLeft: false,
      rollRight: false,
      fire: false,
      zoom: false,
      nextWeapon: false,
      previousWeapon: false,
      weapon1: false,
      weapon2: false,
      weapon3: false,
      mouseDelta: { x: 0, y: 0 },
      tick: 1,
      timestamp: Date.now()
    }

    const input2: PhysicsInput = {
      ...input1,
      forward: false,
      backward: true,
      tick: 1
    }

    inputSystem.addInput('player1', input1)
    inputSystem.addInput('player2', input2)
    inputSystem.update(1/60)

    expect(entity1.input).toEqual(input1)
    expect(entity2.input).toEqual(input2)
  })
}) 