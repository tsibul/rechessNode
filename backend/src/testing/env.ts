/** Jest setup file: keeps mail local (no SMTP, files in a temporary folder) and payment off. */
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

process.env.SMTP_HOST = ''
process.env.MAIL_OUTBOX_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-mail-'))
// Orders must not depend on the developer's `.env`: no payment provider unless a test sets one.
// An empty value counts as set, so dotenv in the suites does not overwrite it.
process.env.PAYMENT_PROVIDER = ''
