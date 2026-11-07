/**
 * Keeps the validation messages of zod 3 that API clients (the CMS shows them as they are) already know.
 * Messages set on a schema with `{ message }` win over these. Imported once by the app factory.
 * @module zodMessages
 */
import { z } from 'zod'

z.config({
  customError: (iss) => {
    switch (iss.code) {
      case 'invalid_type':
        return iss.input === undefined ? 'Required' : `Expected ${iss.expected}, received ${Array.isArray(iss.input) ? 'array' : iss.input === null ? 'null' : typeof iss.input}`
      case 'too_small':
        if (iss.origin === 'string') return `String must contain at least ${iss.minimum} character(s)`
        if (iss.origin === 'array') return `Array must contain at least ${iss.minimum} element(s)`
        return `Number must be greater than${iss.inclusive ? ' or equal to' : ''} ${iss.minimum}`
      case 'too_big':
        if (iss.origin === 'string') return `String must contain at most ${iss.maximum} character(s)`
        if (iss.origin === 'array') return `Array must contain at most ${iss.maximum} element(s)`
        return `Number must be less than${iss.inclusive ? ' or equal to' : ''} ${iss.maximum}`
      case 'invalid_format':
        return iss.format === 'email' ? 'Invalid email' : undefined
      case 'unrecognized_keys':
        return `Unrecognized key(s) in object: ${iss.keys.map((k) => `'${k}'`).join(', ')}`
      default:
        return undefined
    }
  }
})
