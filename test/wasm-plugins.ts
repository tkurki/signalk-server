/**
 * WASM Plugin Tests
 *
 * Tests that WASM plugins:
 * 1. Can be compiled from source
 * 2. Are discovered and loaded by the server
 * 3. Appear in the plugins API endpoint
 * 4. Can be enabled and started
 */

import { expect } from 'chai'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { freeport } from './ts-servertestutilities'
import { startServerP } from './servertestutilities'

const wasmTestConfigDirectory = () =>
  path.join(__dirname, 'wasm-plugin-test-config')

const examplePluginDir = path.join(
  __dirname,
  '..',
  'examples',
  'wasm-plugins',
  'example-hello-assemblyscript'
)

describe('WASM Plugins', function () {
  this.timeout(60000) // WASM compilation and loading can take time

  describe('Build verification', () => {
    it('example-hello-assemblyscript compiles to WASM', function () {
      const wasmPath = path.join(examplePluginDir, 'plugin.wasm')

      // Build the example plugin if not already built
      if (!fs.existsSync(wasmPath)) {
        // Link SDK from workspace and build
        execSync('npm install && npm run build', {
          cwd: examplePluginDir,
          stdio: 'pipe'
        })
      }

      expect(
        fs.existsSync(wasmPath),
        `WASM file should exist at ${wasmPath}. ` +
          `Build it manually: cd examples/wasm-plugins/example-hello-assemblyscript && npm install && npm run build`
      ).to.be.true

      const stats = fs.statSync(wasmPath)
      expect(stats.size).to.be.greaterThan(1000, 'WASM file should be non-trivial size')
    })
  })

  describe('Plugin loading', () => {
    let server: any

    before(async function () {
      // Set up the test environment
      process.env.SIGNALK_NODE_CONFIG_DIR = wasmTestConfigDirectory()

      // Create symlink to the example plugin in test config node_modules
      const pluginDest = path.join(
        wasmTestConfigDirectory(),
        'node_modules',
        '@signalk',
        'example-hello-assemblyscript'
      )

      // Create @signalk directory if needed
      const signalkDir = path.join(wasmTestConfigDirectory(), 'node_modules', '@signalk')
      if (!fs.existsSync(signalkDir)) {
        fs.mkdirSync(signalkDir, { recursive: true })
      }

      // Remove existing symlink/directory if present
      if (fs.existsSync(pluginDest)) {
        fs.rmSync(pluginDest, { recursive: true, force: true })
      }

      // Create symlink
      fs.symlinkSync(examplePluginDir, pluginDest, 'dir')
    })

    after(async function () {
      if (server) {
        await server.stop()
      }
      // Clean up symlink
      const pluginDest = path.join(
        wasmTestConfigDirectory(),
        'node_modules',
        '@signalk',
        'example-hello-assemblyscript'
      )
      if (fs.existsSync(pluginDest)) {
        fs.rmSync(pluginDest, { recursive: true, force: true })
      }
    })

    it('discovers and registers WASM plugin', async function () {
      const port = await freeport()

      server = await startServerP(port, false, {
        settings: {
          interfaces: {
            plugins: true,
            wasm: true
          }
        }
      })

      // Wait a moment for plugins to fully load
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Check that the plugin appears in the plugins list
      const response = await fetch(`http://0.0.0.0:${port}/skServer/plugins`)
      expect(response.status).to.equal(200)

      const plugins = await response.json()
      const wasmPlugin = plugins.find(
        (p: any) =>
          p.id === '_signalk_example-hello-assemblyscript' ||
          p.packageName === '@signalk/example-hello-assemblyscript'
      )

      expect(wasmPlugin, 'WASM plugin should be in plugins list').to.exist
      expect(wasmPlugin.type).to.equal('wasm', 'Plugin should be marked as WASM type')
    })

    it('WASM plugin has correct metadata', async function () {
      // Use the server from the previous test
      const port = server.app.config.settings.port

      const response = await fetch(`http://0.0.0.0:${port}/skServer/plugins`)
      const plugins = await response.json()
      const wasmPlugin = plugins.find(
        (p: any) =>
          p.id === '_signalk_example-hello-assemblyscript' ||
          p.packageName === '@signalk/example-hello-assemblyscript'
      )

      expect(wasmPlugin.name).to.be.a('string')
      expect(wasmPlugin.version).to.equal('0.1.0')
      expect(wasmPlugin.description).to.include('Hello World')
    })

    it('WASM plugin can be enabled and started', async function () {
      const port = server.app.config.settings.port
      const pluginId = '_signalk_example-hello-assemblyscript'

      // Enable and start the plugin via config endpoint
      const configResponse = await fetch(
        `http://0.0.0.0:${port}/skServer/plugins/${pluginId}/config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: true,
            configuration: {
              message: 'Test message'
            }
          })
        }
      )
      expect(configResponse.status).to.equal(200)

      // Wait for plugin to start
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check plugin status
      const statusResponse = await fetch(`http://0.0.0.0:${port}/skServer/plugins`)
      const plugins = await statusResponse.json()
      const wasmPlugin = plugins.find((p: any) => p.id === pluginId)

      expect(wasmPlugin, 'Plugin should still exist after enabling').to.exist
      expect(wasmPlugin.data.enabled).to.equal(true, 'Plugin should be enabled')
    })
  })
})
