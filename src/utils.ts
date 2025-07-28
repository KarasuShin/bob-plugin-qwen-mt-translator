import type { TextTranslateQuery } from '@bob-translate/types'

export function parseStreamData(line: string) {
  try {
    if (!line.trim() || line === 'data: [DONE]')
      return null
    const match = line.match(/^data: (.+)$/)
    if (!match)
      return null
    return JSON.parse(match[1])
  }
  catch {
    return null
  }
}

export function handleError(result: any, query: TextTranslateQuery) {
  if (result.error) {
    query.onCompletion({
      error: {
        type: 'api',
        message: 'service call error',
        addition: JSON.stringify(result),
      },
    })
  }
  else if (result.data.error) {
    query.onCompletion({
      error: {
        type: 'api',
        message: result.data.error.message,
      },
    })
  }
}

export function isValidUrl(url: string) {
  return url.match(/^https?:\/\/.+$/) !== null
}
