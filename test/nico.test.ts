import { describe, expect, it } from 'vitest'
import { fetchEmbeddedData } from '../src/nico'

describe('Nico API Client', () => {
  const liveId = 'lv12345689'

  it('Fetch Embedded Data', async () => {
    const result = await fetchEmbeddedData(liveId)

    expect(result).not.toBeNull()
    expect(result.program.nicoliveProgramId).toBe(liveId)
    expect(result.program.status).toMatch(/ON_AIR|ENDED/)
  })
})
