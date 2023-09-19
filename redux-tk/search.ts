import lunr from 'lunr'
import throttle from 'lodash/throttle'
import { Space, Channel, Group, Asset, Thread, Message } from 'redux-tk/spaces/types'
import * as Y from 'yjs'

interface MyDatabase {
  spaces: Y.Map<Space>
  channels: Y.Map<Channel>
  assets: Y.Map<Asset>
  groups: Y.Map<Group>
  threads: Y.Map<Thread>
  messages: Y.Map<Message>
}

const indexLists: { [key: string]: Record<string, any> } = {}
const indices: { [key: string]: lunr.Index } = {}
const throttledIndices: { [key: string]: () => void } = {}

export const buildIndex = (key: string) => {
  indices[key] = lunr(function () {
    this.pipeline.add(
      lunr.trimmer,
      function(token) {
        return token.update(s => s.toLowerCase())
      }
    )
  
    this.field('guid')
    this.field('message')
    this.field('name')
    this.field('description')
  
    Object.values(indexLists[key]).forEach((entity: any) => {
      const indexedEntity: Record<string, any> = {
        id: entity.guid,
        guid: entity.guid
      }
  
      if (entity.message) {
        indexedEntity.message = entity.message
      }
      if (entity.name) {
        indexedEntity.name = entity.name
      }
      if (entity.description) {
        indexedEntity.description = entity.description
      }
  
      this.add(indexedEntity)
    })
  })
}

export const universalSearch = (searchTerm: string) => {
  // Add wildcard '*' to match substrings
  const lowerSearchTerm = `${searchTerm.toLowerCase()}*`
  const results = {}

  Object.keys(indices).forEach(key => {
    const searchResults = indices[key].search(lowerSearchTerm)
    // @ts-ignore
    results[key] = searchResults.map(result => indexLists[key][result.ref])
  })

  return results
}

export const setupThrottledIndices = (syncDb: MyDatabase) => {
  Object.keys(syncDb).forEach(key => {
    throttledIndices[key] = throttle(() => buildIndex(key), 10000)
  })
}

export const updateIndexListAndTriggerThrottledIndex = (
  name: string,
  payload: Record<string, any>
) => {
  indexLists[name] = payload
  if (throttledIndices[name]) {
    throttledIndices[name]()
  }
}
