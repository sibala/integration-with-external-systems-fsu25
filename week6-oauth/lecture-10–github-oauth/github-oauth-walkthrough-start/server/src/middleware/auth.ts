import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

// Protects admin routes: reads the shop's own cookie – GitHub is not involved here.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = jwt.verify(req.cookies.admin_token ?? '', process.env.SESSION_TOKEN_SECRET as string) as jwt.JwtPayload
    res.locals.admin = { id: payload.id, login: payload.login }
    next()
  } catch {
    res.status(401).json({ error: 'Log in with GitHub' })
  }
}
