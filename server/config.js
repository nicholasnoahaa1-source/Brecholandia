// Quem administra a loja. Só estes e-mails veem a área "Gerenciar".
// Pode ser trocado pela variável ADMIN_EMAILS (vários separados por vírgula).
const DEFAULT_ADMIN_EMAILS = 'nicholasnoahaa3@gmail.com'

export function appConfig(env = process.env) {
  return {
    adminEmails: (env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    // Código exigido para criar a conta de um e-mail administrador.
    // Sem ele, ninguém consegue se cadastrar com esses e-mails.
    adminCode: env.ADMIN_CODE || '',
  }
}
