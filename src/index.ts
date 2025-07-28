import type { PluginValidate, TextTranslate, TextTranslateQuery } from '@bob-translate/types'
import { langMap, supportLanguageList } from './lang'
import { handleError, isValidUrl, parseStreamData } from './utils'

const DEFAULT_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

export const supportLanguages = () => supportLanguageList.map(([standardLang]) => standardLang)

function streamRequest(options: {
  query: TextTranslateQuery
  url: string
}) {
  const { model, apiKey } = $option
  const { query, url } = options

  const sourceLang = langMap.get(query.detectFrom) || query.detectFrom
  const targetLang = langMap.get(query.detectTo) || query.detectTo
  let toParagraphs: string[] = []

  $http.streamRequest({
    method: 'POST',
    url,
    cancelSignal: query.cancelSignal,
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: {
      model,
      messages: [
        {
          role: 'user',
          content: query.text,
        },
      ],
      stream: true,
      translation_options: {
        source_lang: sourceLang,
        target_lang: targetLang,
      },
    },
    streamHandler: (stream) => {
      try {
        const lines = stream.text?.split('\n') ?? []
        for (const line of lines) {
          const data = parseStreamData(line)
          if (!data || !data.choices || !data.choices[0])
            continue

          const choice = data.choices[0]
          toParagraphs = [choice.delta.content]
          if (choice.delta && choice.delta.content) {
            query.onStream({
              result: {
                from: query.detectFrom,
                to: query.detectTo,
                toParagraphs,
              },
            })
          }
        }
      }
      catch (err) {
        $log.error(`Stream data parse error: ${err}`)
      }
    },
    handler: (result: any) => {
      if (result.error || result.data.error) {
        handleError(result, query)
      }
      else {
        query.onCompletion({
          result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs,
          },
        })
      }
    },
  })
}

function request(options: {
  query: TextTranslateQuery
  url: string
}) {
  const { model, apiKey } = $option

  const { query, url } = options

  const sourceLang = langMap.get(query.detectFrom) || query.detectFrom
  const targetLang = langMap.get(query.detectTo) || query.detectTo

  $http.request({
    method: 'POST',
    url,
    cancelSignal: query.cancelSignal,
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: {
      model,
      messages: [
        {
          role: 'user',
          content: query.text,
        },
      ],
      stream: false,
      translation_options: {
        source_lang: sourceLang,
        target_lang: targetLang,
      },
    },
    handler: (result: any) => {
      if (result.error || result.data.error) {
        handleError(result, query)
      }
      else {
        const completion = result.data

        if (!completion?.choices?.[0]?.message) {
          query.onCompletion({
            error: {
              type: 'api',
              message: 'no valid translation result',
              addition: JSON.stringify(result),
            },
          })
          return
        }

        query.onCompletion({
          result: {
            from: query.detectFrom,
            to: query.detectTo,
            toParagraphs: [completion.choices[0].message.content],
          },
        })
      }
    },
  })
}

export const translate: TextTranslate = (query) => {
  const { stream, apiUrl, apiKey } = $option

  if (!apiKey) {
    query.onCompletion({
      error: {
        type: 'param',
        message: 'API key is required',
      },
    })
    return
  }

  const url = `${apiUrl || DEFAULT_API_URL}/chat/completions`

  if (!isValidUrl(url)) {
    query.onCompletion({
      error: {
        type: 'param',
        message: 'Invalid API URL',
      },
    })
    return
  }

  if (stream === 'enable') {
    streamRequest({
      query,
      url,
    })
  }
  else {
    request({
      query,
      url,
    })
  }
}

export const pluginValidate: PluginValidate = async (completion) => {
  const { apiKey, apiUrl } = $option

  if (!apiKey) {
    completion({
      error: {
        type: 'param',
        message: 'API key is required',
      },
      result: false,
    })
    return
  }

  try {
    const url = `${apiUrl || DEFAULT_API_URL}/models`
    if (!isValidUrl(url)) {
      completion({
        result: false,
        error: {
          type: 'param',
          message: 'Invalid API URL',
        },
      })
      return
    }

    const response = await $http.request({
      method: 'GET',
      url,
      header: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    const modelList = Array.isArray(response.data.data) ? response.data.data : []

    if (response.error && 'message' in response.error) {
      completion({
        result: false,
        error: {
          type: 'api',
          message: response.error.message,
        },
      })
      return
    }

    if (response.data.error) {
      completion({
        result: false,
        error: {
          type: 'api',
          message: response.data.error.message,
        },
      })
      return
    }

    if (modelList.length > 0) {
      completion({
        result: true,
      })
      return
    }
    completion({
      result: false,
      error: {
        type: 'api',
        message: 'No valid model found',
      },
    })
  }
  catch {
    completion({
      result: false,
    })
  }
}
