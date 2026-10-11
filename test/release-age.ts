import { expect } from 'chai'
import { execFileSync } from 'child_process'
import path from 'path'
import { getBundledPnpm } from '../src/modules'

const repoRoot = path.join(__dirname, '..')

// pnpm 11 holds a version back for a day after it is published, even in a
// frozen lockfile, unless told otherwise
describe('pnpm release age gate', () => {
  it('is off in the monorepo', () => {
    const minimumReleaseAge = execFileSync(
      process.execPath,
      [getBundledPnpm().bin, 'config', 'get', 'minimumReleaseAge'],
      { cwd: repoRoot, encoding: 'utf8' }
    ).trim()
    expect(minimumReleaseAge).to.equal('0')
  })
})
