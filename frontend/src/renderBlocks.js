import * as hero from './blocks/hero.js'
import * as genreChips from './blocks/genreChips.js'
import * as gameGrid from './blocks/gameGrid.js'
import * as catalog from './blocks/catalog.js'
import * as pick from './blocks/pick.js'
import * as referenceList from './blocks/referenceList.js'
import * as referenceDetail from './blocks/referenceDetail.js'
import * as richText from './blocks/richText.js'
import * as wishlist from './blocks/wishlist.js'
import * as profile from './blocks/profile.js'
import * as authForm from './blocks/authForm.js'
import * as gameDetail from './blocks/gameDetail.js'
import * as gameForm from './blocks/gameForm.js'
import * as reviewList from './blocks/reviewList.js'
import * as reviewDetail from './blocks/reviewDetail.js'


const registry = {
  hero, genreChips, gameGrid, catalog, pick, referenceList, referenceDetail,
  richText, wishlist, profile, authForm, gameDetail, gameForm, reviewList, reviewDetail,
}

export function renderBlocks(blocks, container) {
  container.innerHTML = ''
  for (const block of blocks) {
    const mod = registry[block.type]
    if (!mod) {
      console.warn('Невідомий тип блоку:', block.type)
      continue
    }
    const el = document.createElement('div')
    el.dataset.block = block.type
    el.innerHTML = mod.render(block)
    container.append(el)
    mod.mount?.(el, block)
  }
}
