const got = require('got')

class HttpResolver {
  constructor(urlPattern, options = {}) {
    const {referer} = options
    this.referer = referer
    this.urlPattern = urlPattern
  }

  getUrl(z, x, y) {
    return this.urlPattern.replace('{z}', z).replace('{x}', x).replace('{y}', y)
  }

  getHeaders() {
    return this.referer ? {referer: this.referer} : {}
  }

  async getTile(z, x, y) {
    const url = this.getUrl(z, x, y)

    const response = await got(url, {headers: this.getHeaders(), encoding: null})
    return {data: response.body}
  }
}

module.exports = HttpResolver
