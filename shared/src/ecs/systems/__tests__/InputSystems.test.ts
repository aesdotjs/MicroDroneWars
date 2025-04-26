import { describe, it, expect, beforeEach } from 'vitest'
import { world as ecsWorld } from '../../world'
import { createInputSystem } from '../InputSystems'
import { InputComponent, PhysicsComponent } from '../../types'
import * as CANNON from 'cannon-es'

describe('InputSystems', () => {
  let inputSystem: ReturnType<typeof createInputSystem>
  let mockInput: InputComponent
  let mockPhysics: PhysicsComponent

  beforeEach(() => {
    inputSystem = createInputSystem()
    ecsWorld.clear()
    mockInput = {
      forward: false,
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
      tick: 0,
      timestamp: 0
    }
    mockPhysics = {
      body: new CANNON.Body({ mass: 1 }),
      mass: 1,
      drag: 0.8,
      angularDrag: 0.8,
      maxSpeed: 20,
      maxAngularSpeed: 0.2,
      maxAngularAcceleration: 0.05,
      angularDamping: 0.9,
      forceMultiplier: 0.005,
      thrust: 20,
      lift: 15,
      torque: 1,
      minSpeed: 0,
      bankAngle: 0,
      wingArea: 0,
      strafeForce: 0,
      minHeight: 0
    }
  })

  describe('addInput', () => {
    it('should add input to buffer', () => {
      const input: InputComponent = {
        ...mockInput,
        forward: true,
        tick: 1,
        timestamp: 1000
    }

    inputSystem.addInput('player1', input)
    expect(inputSystem.getLastProcessedInputTick('player1')).toBe(0)
  })

    it('should limit buffer size', () => {
      // Add more inputs than the buffer size
      for (let i = 0; i < 100; i++) {
        inputSystem.addInput('player1', {
          ...mockInput,
          tick: i,
          timestamp: i * 16
        })
      }

      // Create entity to process inputs
      ecsWorld.add({
        id: 'player1',
        input: mockInput,
        physics: mockPhysics
      })

      inputSystem.update(0.016)

      // Should only process the latest input
      const entity = ecsWorld.entities.find(e => e.id === 'player1')
      expect(entity?.input?.tick).toBe(99)
    })
  })

  describe('update', () => {
    it('should process inputs in order', () => {
    const entity = ecsWorld.add({
      id: 'player1',
        input: mockInput,
        physics: mockPhysics
      })

    const input1: InputComponent = {
        ...mockInput,
      forward: true,
      tick: 1,
        timestamp: 1000
    }

    const input2: InputComponent = {
        ...mockInput,
      forward: false,
      backward: true,
        tick: 2,
        timestamp: 1016
    }

    inputSystem.addInput('player1', input2)
    inputSystem.addInput('player1', input1)
      inputSystem.update(0.016)

    expect(entity.input).toEqual(input2)
    expect(inputSystem.getLastProcessedInputTick('player1')).toBe(2)
  })

    it('should handle multiple entities', () => {
      const entity1 = ecsWorld.add({
      id: 'player1',
        input: mockInput,
        physics: mockPhysics
      })

      const entity2 = ecsWorld.add({
        id: 'player2',
        input: mockInput,
        physics: mockPhysics
      })

      const input1: InputComponent = {
        ...mockInput,
        forward: true,
        tick: 1,
        timestamp: 1000
      }

      const input2: InputComponent = {
        ...mockInput,
        forward: false,
        backward: true,
        tick: 1,
        timestamp: 1000
    }

      inputSystem.addInput('player1', input1)
      inputSystem.addInput('player2', input2)
      inputSystem.update(0.016)

      expect(entity1.input).toEqual(input1)
      expect(entity2.input).toEqual(input2)
  })
  })

  describe('cleanup', () => {
    it('should cleanup input buffers', () => {
    const input: InputComponent = {
        ...mockInput,
      forward: true,
      tick: 1,
        timestamp: 1000
    }

    inputSystem.addInput('player1', input)
    inputSystem.cleanup('player1')

    expect(inputSystem.getLastProcessedInputTick('player1')).toBe(0)
  })
  })
}) 