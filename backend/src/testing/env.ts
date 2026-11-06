/** Jest setup file: keeps mail local (no SMTP, files in a temporary folder). */
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

process.env.SMTP_HOST = ''
process.env.MAIL_OUTBOX_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-mail-'))
