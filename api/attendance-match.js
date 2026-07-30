const MAX_IMAGE_LENGTH = 4 * 1024 * 1024
const MAX_SOURCE_PEOPLE = 250
const MAX_EMPLOYEES = 500
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_REQUESTS = 5
const rateBuckets = new Map()

const outputTextFromResponse = (response) => {
  if (response?.output_text) return response.output_text
  return (response?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === 'output_text')
    .map(item => item.text || '')
    .join('')
}

module.exports = async function handler(request, response) {
  if (request.method === 'GET') {
    return response.status(200).json({
      available: Boolean(process.env.OPENAI_API_KEY)
    })
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    return response.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST.' })
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(503).json({
      error: 'Production chưa cấu hình OPENAI_API_KEY.'
    })
  }

  const requestOrigin = String(request.headers?.origin || '')
  const allowedOrigins = new Set(
    [
      'https://hrlumi.vercel.app',
      process.env.APP_ORIGIN,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    ].filter(Boolean)
  )
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
    requestOrigin
  )
  if (requestOrigin && !allowedOrigins.has(requestOrigin) && !isLocalOrigin) {
    return response.status(403).json({ error: 'Nguồn yêu cầu không được phép.' })
  }

  const clientIp = String(
    request.headers?.['x-forwarded-for'] ||
    request.socket?.remoteAddress ||
    'unknown'
  ).split(',')[0].trim()
  const now = Date.now()
  const bucket = rateBuckets.get(clientIp) || []
  const recentRequests = bucket.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS)
  if (recentRequests.length >= RATE_LIMIT_REQUESTS) {
    return response.status(429).json({
      error: 'Đã vượt giới hạn AI. Vui lòng thử lại sau.'
    })
  }
  recentRequests.push(now)
  rateBuckets.set(clientIp, recentRequests)

  const {
    imageDataUrl,
    branch = '',
    sourcePeople = [],
    employees = []
  } = request.body || {}

  if (
    typeof imageDataUrl !== 'string' ||
    !imageDataUrl.startsWith('data:image/') ||
    imageDataUrl.length > MAX_IMAGE_LENGTH
  ) {
    return response.status(400).json({ error: 'Ảnh không hợp lệ hoặc vượt quá giới hạn.' })
  }
  if (
    !Array.isArray(sourcePeople) ||
    sourcePeople.length === 0 ||
    sourcePeople.length > MAX_SOURCE_PEOPLE
  ) {
    return response.status(400).json({ error: 'Danh sách tên nguồn không hợp lệ.' })
  }
  if (
    !Array.isArray(employees) ||
    employees.length === 0 ||
    employees.length > MAX_EMPLOYEES
  ) {
    return response.status(400).json({ error: 'Danh sách nhân sự Lumi không hợp lệ.' })
  }

  const allowedEmployeeIds = new Set(employees.map(employee => String(employee.id)))
  const sourceKeys = new Set(sourcePeople.map(person => String(person.sourceKey)))
  const promptPayload = {
    branch,
    sourcePeople: sourcePeople.map(person => ({
      sourceKey: String(person.sourceKey || ''),
      sourceCode: String(person.sourceCode || ''),
      sourceName: String(person.sourceName || '')
    })),
    employees: employees.map(employee => ({
      id: String(employee.id || ''),
      employeeCode: String(employee.employeeCode || ''),
      name: String(employee.name || ''),
      branch: String(employee.branch || ''),
      department: String(employee.department || '')
    }))
  }

  try {
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6',
        instructions: [
          'Bạn là chuyên gia đối soát tên nhân sự Việt Nam.',
          'Đọc tên/mã trong ảnh và đối chiếu với sourcePeople và employees.',
          'Tên có thể không dấu, viết liền, sai khoảng trắng hoặc thiếu tên đệm.',
          'Chỉ trả employeeId có trong danh sách employees.',
          'Nếu không đủ chắc chắn, matched=false và employeeId để trống.',
          'Không ghép hai sourceKey khác nhau vào cùng một người nếu ảnh không chứng minh đó là cùng người.'
        ].join(' '),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Đối soát dữ liệu sau:\n${JSON.stringify(promptPayload)}`
              },
              {
                type: 'input_image',
                image_url: imageDataUrl,
                detail: 'high'
              }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'attendance_employee_matches',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      sourceKey: { type: 'string' },
                      matched: { type: 'boolean' },
                      employeeId: { type: 'string' },
                      confidence: { type: 'number' },
                      reason: { type: 'string' }
                    },
                    required: [
                      'sourceKey',
                      'matched',
                      'employeeId',
                      'confidence',
                      'reason'
                    ]
                  }
                }
              },
              required: ['matches']
            }
          }
        }
      })
    })

    const apiPayload = await apiResponse.json()
    if (!apiResponse.ok) {
      const message =
        apiPayload?.error?.message ||
        `OpenAI API trả về HTTP ${apiResponse.status}`
      return response.status(502).json({ error: message })
    }

    const parsed = JSON.parse(outputTextFromResponse(apiPayload) || '{}')
    const matches = (parsed.matches || []).filter(match =>
      match?.matched &&
      sourceKeys.has(String(match.sourceKey)) &&
      allowedEmployeeIds.has(String(match.employeeId))
    )

    return response.status(200).json({ matches })
  } catch (error) {
    return response.status(500).json({
      error: error?.message || 'Không thể xử lý đối sánh bằng AI.'
    })
  }
}
