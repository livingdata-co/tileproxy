import {readFileSync} from 'node:fs'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import Keyv from 'keyv'
import {load as loadYamlFile} from 'js-yaml'

import HttpResolver from './lib/resolvers/http.js'

const ONE_HOUR = 60 * 60
const ONE_DAY = 24 * ONE_HOUR
const EXPIRES_DURATION = 7 * ONE_DAY

const app = express()
const cache = new Keyv('sqlite://cache.sqlite')

app.disable('x-powered-by')
app.use(cors({origin: true}))

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

const tiles = loadYamlFile(readFileSync('./tiles.yml'))

function w(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}

tiles.forEach(tileService => {
  app.use(`/${tileService.name}/tiles`, (req, res, next) => {
    res.sendTile = tileData => {
      res
        .set('cache-control', `public, max-age=${EXPIRES_DURATION}`)
        .set('expires', new Date(Date.now() + (EXPIRES_DURATION * 1000)).toUTCString())
        .type(tileService.imageType)
        .send(tileData)
    }

    next()
  })

  app.get(`/${tileService.name}/tiles/:z/:x/:y`, w(async (req, res) => {
    const {z, x, y} = req.params
    const key = `${tileService.name}-${z}-${x}-${y}`

    const cachedTile = await cache.get(key)
    if (cachedTile) {
      return res.sendTile(cachedTile.data)
    }

    const resolver = new HttpResolver(tileService.resolver.url, tileService.resolver.headers || {})
    const tile = await resolver.getTile(z, x, y)

    cache.set(key, tile).catch(error => {
      console.error(error)
    })

    res.sendTile(tile.data)
  }))
})

app.listen(process.env.PORT || 5000)
